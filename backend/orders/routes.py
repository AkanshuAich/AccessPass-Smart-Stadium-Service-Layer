import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from orders.models import Order
from stalls.models import Stall
from auth.jwt_handler import get_current_user
from auth.models import User
from datetime import datetime, timezone
from websocket.manager import manager

router = APIRouter(prefix="/orders", tags=["Orders"])


class OrderItemInput(BaseModel):
    menu_item_id: int
    name: str
    quantity: int
    price: float


class CreateOrderRequest(BaseModel):
    stall_id: int
    items: list[OrderItemInput]


class OrderResponse(BaseModel):
    id: int
    stall_id: int
    stall_name: str
    items: list[dict]
    status: str
    token_number: int
    estimated_wait: int
    rejection_reason: str | None = None
    created_at: str


@router.post("", response_model=OrderResponse)
async def create_order(
    req: CreateOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Place an order / join the digital queue."""
    stall = db.query(Stall).filter(Stall.id == req.stall_id).first()
    if not stall:
        raise HTTPException(status_code=404, detail="Stall not found")

    # Check if user already has an active order at this stall
    active = (
        db.query(Order)
        .filter(
            Order.user_id == current_user.id,
            Order.stall_id == req.stall_id,
            Order.status.in_(["queued", "preparing"]),
        )
        .first()
    )
    if active:
        raise HTTPException(status_code=400, detail="You already have an active order at this stall")

    # Calculate token number (next in line for this stall)
    last_token = (
        db.query(Order)
        .filter(Order.stall_id == req.stall_id)
        .order_by(Order.token_number.desc())
        .first()
    )
    token = (last_token.token_number + 1) if last_token else 1

    # Calculate estimated wait
    active_count = (
        db.query(Order)
        .filter(Order.stall_id == req.stall_id, Order.status.in_(["queued", "preparing"]))
        .count()
    )
    estimated_wait = active_count * stall.avg_service_time

    order = Order(
        user_id=current_user.id,
        stall_id=req.stall_id,
        items_json=json.dumps([item.model_dump() for item in req.items]),
        token_number=token,
        estimated_wait=estimated_wait,
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    response = OrderResponse(
        id=order.id,
        stall_id=order.stall_id,
        stall_name=stall.name,
        items=json.loads(order.items_json),
        status=order.status,
        token_number=order.token_number,
        estimated_wait=order.estimated_wait,
        rejection_reason=order.rejection_reason,
        created_at=order.created_at.isoformat(),
    )

    await manager.broadcast({
        "type": "order_update",
        "is_new": True,
        "stall_id": order.stall_id,
        "order": response.model_dump()
    })

    return response


@router.get("", response_model=list[OrderResponse])
def list_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all orders for the current user."""
    orders = (
        db.query(Order)
        .filter(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    result = []
    for o in orders:
        stall = db.query(Stall).filter(Stall.id == o.stall_id).first()
        result.append(
            OrderResponse(
                id=o.id,
                stall_id=o.stall_id,
                stall_name=stall.name if stall else "Unknown",
                items=json.loads(o.items_json),
                status=o.status,
                token_number=o.token_number,
                estimated_wait=o.estimated_wait,
                rejection_reason=o.rejection_reason,
                created_at=o.created_at.isoformat(),
            )
        )
    return result


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific order."""
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    stall = db.query(Stall).filter(Stall.id == order.stall_id).first()
    return OrderResponse(
        id=order.id,
        stall_id=order.stall_id,
        stall_name=stall.name if stall else "Unknown",
        items=json.loads(order.items_json),
        status=order.status,
        token_number=order.token_number,
        estimated_wait=order.estimated_wait,
        rejection_reason=order.rejection_reason,
        created_at=order.created_at.isoformat(),
    )


@router.patch("/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel an active order."""
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in ["queued", "preparing"]:
        raise HTTPException(status_code=400, detail="Cannot cancel — order is already " + order.status)

    order.status = "cancelled"
    order.updated_at = datetime.now(timezone.utc)
    db.commit()

    await manager.broadcast({
        "type": "order_update",
        "order_id": order.id,
        "status": "cancelled",
        "stall_id": order.stall_id
    })
    
    return {"message": "Order cancelled", "order_id": order.id}
