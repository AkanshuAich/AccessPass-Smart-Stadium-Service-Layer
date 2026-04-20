from sqlalchemy import Column, Integer, String, Float, Boolean, Text
from database import Base


class Stall(Base):
    __tablename__ = "stalls"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # food, beverage, snacks, dessert
    location = Column(String, nullable=False)  # e.g. "Gate A", "North Stand"
    description = Column(Text, default="")
    avg_service_time = Column(Integer, default=3)  # minutes per order
    is_open = Column(Boolean, default=True)
    image_url = Column(String, default="")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    stall_id = Column(Integer, nullable=False, index=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    description = Column(String, default="")
    is_available = Column(Boolean, default=True)
