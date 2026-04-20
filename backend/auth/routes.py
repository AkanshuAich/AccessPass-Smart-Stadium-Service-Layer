from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from auth.models import User
from auth.jwt_handler import create_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


class ScanRequest(BaseModel):
    ticket_id: str
    section: str
    seat: str


class AuthResponse(BaseModel):
    token: str
    user: dict


class UserResponse(BaseModel):
    id: int
    ticket_id: str
    section: str
    seat: str
    role: str
    stall_id: int | None = None


@router.post("/scan", response_model=AuthResponse)
def scan_ticket(req: ScanRequest, db: Session = Depends(get_db)):
    """
    Scan-to-Activate login.
    Validates ticket data, creates or retrieves user, returns JWT.
    """
    # Check if ticket already used
    existing = db.query(User).filter(User.ticket_id == req.ticket_id).first()

    if existing:
        if existing.ticket_id == "vendor_demo":
            existing.stall_id = None
            db.commit()
            db.refresh(existing)
            
        # Return existing session (re-login)
        token = create_token(existing.id, existing.ticket_id, existing.section, existing.seat, existing.role, existing.stall_id)
        return AuthResponse(
            token=token,
            user={
                "id": existing.id,
                "ticket_id": existing.ticket_id,
                "section": existing.section,
                "seat": existing.seat,
                "role": existing.role,
                "stall_id": existing.stall_id,
            },
        )

    # Mock validation — in production, verify against ticketing system
    if not req.ticket_id or not req.section or not req.seat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ticket data",
        )

    # Mock Vendor extraction logic
    role = "customer"
    stall_id = None
    if req.ticket_id.startswith("vendor_demo"):
        role = "vendor"
        stall_id = None

    # Create new user
    user = User(ticket_id=req.ticket_id, section=req.section, seat=req.seat, role=role, stall_id=stall_id)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user.id, user.ticket_id, user.section, user.seat, user.role, user.stall_id)
    return AuthResponse(
        token=token,
        user={
            "id": user.id,
            "ticket_id": user.ticket_id,
            "section": user.section,
            "seat": user.seat,
            "role": user.role,
            "stall_id": user.stall_id,
        },
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return UserResponse(
        id=current_user.id,
        ticket_id=current_user.ticket_id,
        section=current_user.section,
        seat=current_user.seat,
        role=current_user.role,
        stall_id=current_user.stall_id,
    )
