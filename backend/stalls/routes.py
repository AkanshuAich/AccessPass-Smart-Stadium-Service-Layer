from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from stalls.models import Stall, MenuItem
from orders.models import Order
from auth.jwt_handler import get_current_user
from auth.models import User
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/stalls", tags=["Stalls"])


class StallResponse(BaseModel):
    id: int
    name: str
    category: str
    location: str
    description: str
    avg_service_time: int
    is_open: bool
    image_url: str
    active_orders: int
    wait_time: int
    rush_status: Optional[str]


class MenuItemResponse(BaseModel):
    id: int
    name: str
    price: float
    description: str
    is_available: bool


class StallDetailResponse(StallResponse):
    menu: list[MenuItemResponse]


def _compute_stall_stats(db: Session, stall: Stall) -> dict:
    """Compute live wait time and rush status for a stall."""
    active = (
        db.query(Order)
        .filter(Order.stall_id == stall.id, Order.status.in_(["queued", "preparing"]))
        .count()
    )
    wait = active * stall.avg_service_time

    # Rush detection: orders in last 5 min vs baseline (last 30 min / 6)
    now = datetime.now(timezone.utc)
    recent = (
        db.query(Order)
        .filter(
            Order.stall_id == stall.id,
            Order.created_at >= now - timedelta(minutes=5),
        )
        .count()
    )
    baseline_window = (
        db.query(Order)
        .filter(
            Order.stall_id == stall.id,
            Order.created_at >= now - timedelta(minutes=30),
        )
        .count()
    )
    baseline_rate = baseline_window / 6 if baseline_window > 0 else 0
    rush = None
    if recent > 0 and baseline_rate > 0 and recent > baseline_rate * 1.8:
        rush = "🔥 Rush incoming!"
    elif active > 8:
        rush = "⚠️ High demand"

    return {"active_orders": active, "wait_time": wait, "rush_status": rush}


@router.get("", response_model=list[StallResponse])
def list_stalls(db: Session = Depends(get_db)):
    """List all stalls with computed wait times."""
    stalls = db.query(Stall).filter(Stall.is_open == True).all()
    result = []
    for s in stalls:
        stats = _compute_stall_stats(db, s)
        result.append(
            StallResponse(
                id=s.id,
                name=s.name,
                category=s.category,
                location=s.location,
                description=s.description,
                avg_service_time=s.avg_service_time,
                is_open=s.is_open,
                image_url=s.image_url,
                **stats,
            )
        )
    return result


@router.get("/{stall_id}", response_model=StallDetailResponse)
def get_stall(stall_id: int, db: Session = Depends(get_db)):
    """Get stall detail with menu and live stats."""
    stall = db.query(Stall).filter(Stall.id == stall_id).first()
    if not stall:
        raise HTTPException(status_code=404, detail="Stall not found")

    stats = _compute_stall_stats(db, stall)
    items = db.query(MenuItem).filter(MenuItem.stall_id == stall_id).all()

    return StallDetailResponse(
        id=stall.id,
        name=stall.name,
        category=stall.category,
        location=stall.location,
        description=stall.description,
        avg_service_time=stall.avg_service_time,
        is_open=stall.is_open,
        image_url=stall.image_url,
        menu=[
            MenuItemResponse(
                id=i.id,
                name=i.name,
                price=i.price,
                description=i.description,
                is_available=i.is_available,
            )
            for i in items
        ],
        **stats,
    )
