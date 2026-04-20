from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime, timezone
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String, unique=True, nullable=False, index=True)
    section = Column(String, nullable=False)
    seat = Column(String, nullable=False)
    role = Column(String, default="customer")
    stall_id = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
