import asyncio
import random
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import SessionLocal
from orders.models import Order
from stalls.models import Stall
from websocket.manager import manager

# Simulation state
_running = False
_match_minute = 0  # simulated match clock (0-90)


def _is_peak_time(minute: int) -> bool:
    """Halftime (45-60), pre-match (0-5), or goal celebration."""
    return minute in range(45, 61) or minute in range(0, 6)


async def run_simulation():
    """
    Background simulation loop that:
    1. Generates fake orders at random stalls
    2. Advances existing order statuses
    3. Simulates peak-time rushes
    4. Broadcasts updates via WebSocket
    """
    global _running, _match_minute
    _running = True
    _match_minute = 0

    while _running:
        db: Session = SessionLocal()
        try:
            stalls = db.query(Stall).filter(Stall.is_open == True).all()
            if not stalls:
                await asyncio.sleep(5)
                continue

            # --- 1. Generate new fake orders ---
            peak = _is_peak_time(_match_minute)
            num_new = random.randint(2, 6) if peak else random.randint(0, 2)

            for _ in range(num_new):
                stall = random.choice(stalls)
                last = (
                    db.query(Order)
                    .filter(Order.stall_id == stall.id)
                    .order_by(Order.token_number.desc())
                    .first()
                )
                token = (last.token_number + 1) if last else 1

                # Random items
                items = [
                    {"name": random.choice(["Burger", "Fries", "Soda", "Nachos", "Hot Dog", "Pizza Slice", "Coffee", "Water"]),
                     "quantity": 1,
                     "price": round(random.uniform(3, 15), 2)}
                ]

                order = Order(
                    user_id=0,  # simulation user
                    stall_id=stall.id,
                    items_json=json.dumps(items),
                    status="pending",
                    token_number=token,
                    estimated_wait=0,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                db.add(order)

            # --- 2. Advance order statuses ---
            pending = db.query(Order).filter(Order.status == "pending", Order.user_id == 0).all()
            for o in pending:
                rand = random.random()
                if rand < 0.6:
                    o.status = "queued"
                    o.updated_at = datetime.now(timezone.utc)
                    await manager.broadcast({
                        "type": "order_update",
                        "order_id": o.id,
                        "status": "queued",
                        "stall_id": o.stall_id
                    })
                elif rand > 0.95:
                    o.status = "rejected"
                    o.rejection_reason = "Out of Simulation Stock"
                    o.updated_at = datetime.now(timezone.utc)
                    await manager.broadcast({
                        "type": "order_update",
                        "order_id": o.id,
                        "status": "rejected",
                        "rejection_reason": o.rejection_reason,
                        "stall_id": o.stall_id
                    })

            queued = db.query(Order).filter(Order.status == "queued", Order.user_id == 0).all()
            for o in queued:
                if random.random() < 0.3:
                    o.status = "preparing"
                    o.updated_at = datetime.now(timezone.utc)
                    await manager.broadcast({
                        "type": "order_update",
                        "order_id": o.id,
                        "status": "preparing",
                        "stall_id": o.stall_id
                    })

            preparing = db.query(Order).filter(Order.status == "preparing", Order.user_id == 0).all()
            for o in preparing:
                if random.random() < 0.25:
                    o.status = "ready"
                    o.updated_at = datetime.now(timezone.utc)
                    await manager.broadcast({
                        "type": "order_update",
                        "order_id": o.id,
                        "status": "ready",
                        "stall_id": o.stall_id
                    })

            ready = db.query(Order).filter(Order.status == "ready", Order.user_id == 0).all()
            for o in ready:
                if random.random() < 0.4:
                    o.status = "collected"
                    o.updated_at = datetime.now(timezone.utc)
                    await manager.broadcast({
                        "type": "order_update",
                        "order_id": o.id,
                        "status": "collected",
                        "stall_id": o.stall_id
                    })

            db.commit()

            # --- 3. Build broadcast data ---
            stall_updates = []
            for s in stalls:
                active = (
                    db.query(Order)
                    .filter(Order.stall_id == s.id, Order.status.in_(["queued", "preparing"]))
                    .count()
                )
                stall_updates.append({
                    "id": s.id,
                    "name": s.name,
                    "active_orders": active,
                    "wait_time": active * s.avg_service_time,
                    "is_peak": peak,
                })

            await manager.broadcast({
                "type": "stall_update",
                "match_minute": _match_minute,
                "is_peak": peak,
                "data": stall_updates,
            })

            # Advance match clock
            _match_minute = (_match_minute + 1) % 91

        except Exception as e:
            print(f"Simulation error: {e}")
        finally:
            db.close()

        await asyncio.sleep(6)  # tick every 6 seconds


def stop_simulation():
    global _running
    _running = False
