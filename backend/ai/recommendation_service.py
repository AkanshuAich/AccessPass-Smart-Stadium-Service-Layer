"""
ai/recommendation_service.py

Production-grade Gemini stall recommendation service.

Optimizations applied:
  1. Timeout raised to 5s (from 2s) — handles cold API start
  2. Top-5 stalls only — reduces prompt tokens → faster response
  3. TTL cache (60s per section) — avoids repeated Gemini calls
  4. Pre-warm function called at app startup
  5. Always-available fallback logic
"""

import asyncio
import json
import time
import concurrent.futures
from ai.gemini_service import _get_client, _fallback_suggestions

# ── Fix 3 & 4: Simple TTL cache (section → (timestamp, result)) ─────────────
_cache: dict[str, tuple[float, dict]] = {}
CACHE_TTL_SECONDS = 60        # fresh for 60 s; re-calls Gemini after that

# ── Fix 1: Raised timeout ────────────────────────────────────────────────────
GEMINI_TIMEOUT_SECONDS = 5.0  # 5 s gives Gemini enough time after cold start


# ── Pre-warm (Fix 3) ─────────────────────────────────────────────────────────
def prewarm_gemini():
    """
    Call once at startup to eliminate cold-start latency on the first real request.
    Runs in a daemon thread so it never blocks server startup.
    """
    def _ping():
        try:
            client = _get_client()
            if client:
                client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents="Hi",
                )
                print("✅ Gemini pre-warmed successfully")
        except Exception as e:
            print(f"ℹ️  Gemini pre-warm skipped: {e}")

    t = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    t.submit(_ping)
    t.shutdown(wait=False)


# ── Public async entry point ──────────────────────────────────────────────────
async def get_smart_suggestions(stalls_data: list[dict], user_section: str) -> dict:
    """
    Returns AI-powered stall suggestion.
    Priority: cache hit → Gemini (timeout 5 s) → rule-based fallback.
    """
    # Check cache first (Fix 4)
    cache_key = user_section.upper()
    cached = _cache.get(cache_key)
    if cached:
        ts, data = cached
        if time.time() - ts < CACHE_TTL_SECONDS:
            return data

    try:
        result = await asyncio.wait_for(
            _call_gemini_async(stalls_data, user_section),
            timeout=GEMINI_TIMEOUT_SECONDS,
        )
        # Store in cache on success
        _cache[cache_key] = (time.time(), result)
        return result

    except asyncio.TimeoutError:
        print(f"⚠️  Gemini timed out after {GEMINI_TIMEOUT_SECONDS}s — using fallback")
        return _fallback_suggestions(stalls_data, user_section)
    except Exception as e:
        print(f"⚠️  Gemini error: {e} — using fallback")
        return _fallback_suggestions(stalls_data, user_section)


# ── Async wrapper (runs sync Gemini in thread pool) ───────────────────────────
async def _call_gemini_async(stalls_data: list[dict], user_section: str) -> dict:
    """Run sync Gemini call in thread executor — never blocks the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync_gemini_call, stalls_data, user_section)


# ── Sync Gemini call with trimmed prompt ──────────────────────────────────────
def _sync_gemini_call(stalls_data: list[dict], user_section: str) -> dict:
    client = _get_client()
    if not client:
        return _fallback_suggestions(stalls_data, user_section)

    # Fix 2: Top 5 lowest-wait stalls only — fewer tokens = faster response
    top_stalls = sorted(stalls_data, key=lambda s: s.get("wait_time", 999))[:5]
    slim_stalls = [
        {
            "id":           s["id"],
            "name":         s["name"],
            "category":     s["category"],
            "wait_time":    s["wait_time"],
            "active_orders": s["active_orders"],
            "rush":         bool(s.get("rush_status")),
        }
        for s in top_stalls
    ]

    prompt = (
        f"Stadium app. User in Section {user_section}. "
        f"Stalls (sorted by wait): {json.dumps(slim_stalls)}. "
        "Reply ONLY with JSON: "
        '{"best_stall":{"id":<int>,"name":"<str>","reason":"<12 words max>"},'
        '"best_timing":"<10 words>","tip":"<15 words>","summary":"<2 sentences>"}'
        " Prefer low wait_time and no rush."
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    text = response.text.strip()
    # Strip markdown fences if model wraps response
    if text.startswith("```"):
        text = "\n".join(text.split("\n")[1:])
        text = text.rsplit("```", 1)[0].strip()

    return json.loads(text)
