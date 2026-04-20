import json
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import get_db
from auth.jwt_handler import get_current_user
from auth.models import User
from orders.models import Order
from stalls.models import Stall
from orders.routes import OrderResponse
from websocket.manager import manager

router = APIRouter(prefix="/vendor", tags=["Vendor"])

def verify_vendor(current_user: User):
    """Verifies that user is a vendor AND has a stall selected."""
    if current_user.role != "vendor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to vendors"
        )
    if current_user.stall_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No stall assigned yet"
        )
    return current_user

def verify_vendor_role(current_user: User):
    """Verifies only that the user is a vendor."""
    if current_user.role != "vendor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to vendors"
        )
    return current_user


class AssignStallRequest(BaseModel):
    stall_id: int

@router.patch("/assign-stall")
def assign_stall(
    req: AssignStallRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assigns the logged-in vendor to a specific stall."""
    vendor = verify_vendor_role(current_user)
    
    stall = db.query(Stall).filter(Stall.id == req.stall_id).first()
    if not stall:
        raise HTTPException(status_code=404, detail="Stall not found")
        
    vendor = db.query(User).filter(User.id == vendor.id).first()
    vendor.stall_id = req.stall_id
    db.commit()
    
    return {"message": "Stall assigned successfully", "stall_id": req.stall_id}

@router.get("/orders", response_model=list[OrderResponse])
def get_vendor_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all orders for the vendor's stall."""
    vendor = verify_vendor(current_user)
    
    stall = db.query(Stall).filter(Stall.id == vendor.stall_id).first()
    if not stall:
        raise HTTPException(status_code=404, detail="Stall not found")

    orders = (
        db.query(Order)
        .filter(Order.stall_id == vendor.stall_id)
        .order_by(Order.created_at.desc())
        .limit(100) # Basic limit to prevent huge payloads for historical orders
        .all()
    )

    result = []
    for o in orders:
        result.append(
            OrderResponse(
                id=o.id,
                stall_id=o.stall_id,
                stall_name=stall.name,
                items=json.loads(o.items_json),
                status=o.status,
                token_number=o.token_number,
                estimated_wait=o.estimated_wait,
                created_at=o.created_at.isoformat(),
            )
        )
    return result


@router.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    status_update: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update order status. Flow: pending -> queued -> preparing -> ready -> collected | completed | rejected"""
    vendor = verify_vendor(current_user)
    new_status = status_update.get("status")
    rejection_reason = status_update.get("rejection_reason")
    
    valid_statuses = ["pending", "queued", "preparing", "ready", "collected", "completed", "cancelled", "rejected"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.stall_id != vendor.stall_id:
        raise HTTPException(status_code=403, detail="Order does not belong to your stall")

    order.status = new_status
    if new_status == "rejected" and rejection_reason:
        order.rejection_reason = rejection_reason

    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    # Broadcast to all clients
    await manager.broadcast({
        "type": "order_update",
        "order_id": order.id,
        "status": new_status,
        "rejection_reason": order.rejection_reason,
        "stall_id": order.stall_id,
        "user_id": order.user_id,
        "token_number": order.token_number
    })
    
    return {"message": "Order updated", "status": new_status}
