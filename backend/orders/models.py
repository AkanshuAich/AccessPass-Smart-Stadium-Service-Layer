from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime, timezone
from database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    stall_id = Column(Integer, nullable=False, index=True)
    items_json = Column(Text, nullable=False)  # JSON string of ordered items
    status = Column(String, default="pending")  # pending, queued, preparing, ready, collected, rejected
    rejection_reason = Column(Text, nullable=True)
    token_number = Column(Integer, nullable=False)
    estimated_wait = Column(Integer, default=0)  # minutes
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
