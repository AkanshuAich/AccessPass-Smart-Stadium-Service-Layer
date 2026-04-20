import json
import os
from config import GEMINI_API_KEY

# Lazy-loaded client
_client = None


def _get_client():
    global _client
    if _client is None and GEMINI_API_KEY:
        try:
            from google import genai
            _client = genai.Client(api_key=GEMINI_API_KEY)
        except Exception:
            _client = None
    return _client


def get_stall_suggestions(stalls_data: list[dict], user_section: str) -> dict:
    """
    Use Gemini to generate intelligent stall suggestions.
    Falls back to rule-based suggestions if API is unavailable.
    """
    client = _get_client()

    if not client:
        return _fallback_suggestions(stalls_data, user_section)

    try:
        prompt = f"""You are an AI assistant for a smart stadium app called AccessPass.

The user is seated in Section {user_section}. Based on the current stall data below, 
provide a helpful suggestion about which stall to visit and when.

Current stall data:
{json.dumps(stalls_data, indent=2)}

Respond in this exact JSON format:
{{
  "best_stall": {{
    "id": <stall_id>,
    "name": "<stall_name>",
    "reason": "<short 1-sentence reason>"
  }},
  "best_timing": "<when to go, e.g. 'Now — wait times are low' or 'Wait 10 minutes for the rush to clear'>",
  "tip": "<one practical tip for the user>",
  "summary": "<2-sentence overall recommendation>"
}}

Rules:
- Prefer stalls with LOW wait times near the user's section
- Consider rush status in your recommendation  
- Be concise and actionable
- Return ONLY valid JSON, no markdown"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        text = response.text.strip()
        # Remove markdown code blocks if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]

        return json.loads(text)

    except Exception as e:
        print(f"Gemini API error: {e}")
        return _fallback_suggestions(stalls_data, user_section)


def _fallback_suggestions(stalls_data: list[dict], user_section: str) -> dict:
    """Rule-based fallback when Gemini is unavailable."""
    if not stalls_data:
        return {
            "best_stall": None,
            "best_timing": "No stalls available right now.",
            "tip": "Check back in a few minutes.",
            "summary": "No stall data available at the moment.",
        }

    # Sort by wait time
    sorted_stalls = sorted(stalls_data, key=lambda s: s.get("wait_time", 999))
    best = sorted_stalls[0]

    rush_stalls = [s for s in stalls_data if s.get("rush_status")]
    timing = "Now — wait times are low!" if best["wait_time"] <= 5 else "Wait a few minutes for shorter lines."
    if rush_stalls:
        timing = f"Avoid {rush_stalls[0]['name']} — rush detected. Try {best['name']} instead."

    return {
        "best_stall": {
            "id": best["id"],
            "name": best["name"],
            "reason": f"Shortest wait at {best['wait_time']} min with {best['active_orders']} orders ahead.",
        },
        "best_timing": timing,
        "tip": f"Pro tip: {best['name']} near {best['location']} is your fastest option right now.",
        "summary": f"Head to {best['name']} for the quickest service. Current wait is only {best['wait_time']} minutes.",
    }
