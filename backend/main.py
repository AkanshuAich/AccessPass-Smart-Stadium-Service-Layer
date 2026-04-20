import asyncio
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, SessionLocal, Base, engine
from auth.routes import router as auth_router
from stalls.routes import router as stalls_router
from orders.routes import router as orders_router
from ai.gemini_service import get_stall_suggestions
from websocket.manager import manager
from simulation.engine import run_simulation, stop_simulation
from stalls.models import Stall, MenuItem
from orders.models import Order
from auth.models import User
from vendor.routes import router as vendor_router


def seed_stalls(db):
    """Seed the database with sample stadium stalls and menus."""
    if db.query(Stall).count() > 0:
        return

    stalls_data = [
        {
            "name": "Stadium Burger Co.",
            "category": "food",
            "location": "Gate A — North Stand",
            "description": "Juicy gourmet burgers made fresh on the grill",
            "avg_service_time": 4,
            "image_url": "/stalls/burger.jpg",
            "menu": [
                {"name": "Classic Burger", "price": 8.99, "description": "Beef patty, lettuce, tomato, cheese"},
                {"name": "Chicken Burger", "price": 9.49, "description": "Grilled chicken, mayo, pickles"},
                {"name": "Veggie Burger", "price": 7.99, "description": "Plant-based patty, fresh veggies"},
                {"name": "Fries", "price": 3.99, "description": "Crispy golden fries"},
            ],
        },
        {
            "name": "Pizza Corner",
            "category": "food",
            "location": "Gate B — East Stand",
            "description": "Wood-fired pizza slices ready in minutes",
            "avg_service_time": 3,
            "image_url": "/stalls/pizza.jpg",
            "menu": [
                {"name": "Margherita Slice", "price": 5.99, "description": "Classic tomato, mozzarella, basil"},
                {"name": "Pepperoni Slice", "price": 6.99, "description": "Loaded pepperoni, extra cheese"},
                {"name": "BBQ Chicken Slice", "price": 7.49, "description": "BBQ sauce, grilled chicken, onions"},
            ],
        },
        {
            "name": "Taco Fiesta",
            "category": "food",
            "location": "Gate C — South Stand",
            "description": "Authentic Mexican tacos and nachos",
            "avg_service_time": 3,
            "image_url": "/stalls/taco.jpg",
            "menu": [
                {"name": "Beef Tacos (2)", "price": 7.99, "description": "Seasoned beef, salsa, cilantro"},
                {"name": "Chicken Tacos (2)", "price": 7.49, "description": "Grilled chicken, guacamole"},
                {"name": "Loaded Nachos", "price": 8.99, "description": "Cheese, jalapeños, sour cream"},
            ],
        },
        {
            "name": "Drinks Hub",
            "category": "beverage",
            "location": "Gate A — North Stand",
            "description": "Cold drinks, fresh juices, and hot beverages",
            "avg_service_time": 2,
            "image_url": "/stalls/drinks.jpg",
            "menu": [
                {"name": "Cola", "price": 3.49, "description": "Ice-cold cola"},
                {"name": "Fresh Lemonade", "price": 4.99, "description": "Freshly squeezed lemons, mint"},
                {"name": "Coffee", "price": 4.49, "description": "Hot espresso-based coffee"},
                {"name": "Water", "price": 1.99, "description": "500ml bottled water"},
            ],
        },
        {
            "name": "Sweet Spot",
            "category": "dessert",
            "location": "Gate D — West Stand",
            "description": "Ice cream, churros, and sweet treats",
            "avg_service_time": 2,
            "image_url": "/stalls/dessert.jpg",
            "menu": [
                {"name": "Ice Cream Cup", "price": 4.99, "description": "Two scoops, choice of flavor"},
                {"name": "Churros (5)", "price": 5.99, "description": "Cinnamon sugar, chocolate dip"},
                {"name": "Cotton Candy", "price": 3.99, "description": "Classic spun sugar"},
            ],
        },
        {
            "name": "The Snack Shack",
            "category": "snacks",
            "location": "Gate B — East Stand",
            "description": "Quick bites and game-day favorites",
            "avg_service_time": 2,
            "image_url": "/stalls/snacks.jpg",
            "menu": [
                {"name": "Hot Dog", "price": 5.49, "description": "All-beef frank, mustard, ketchup"},
                {"name": "Popcorn (L)", "price": 4.99, "description": "Butter or caramel flavored"},
                {"name": "Pretzel", "price": 3.99, "description": "Warm soft pretzel, cheese dip"},
            ],
        },
        {
            "name": "Noodle Box",
            "category": "food",
            "location": "Gate C — South Stand",
            "description": "Asian-style noodles and fried rice",
            "avg_service_time": 5,
            "image_url": "/stalls/noodle.jpg",
            "menu": [
                {"name": "Fried Noodles", "price": 8.99, "description": "Stir-fried noodles, veggies, soy sauce"},
                {"name": "Fried Rice", "price": 7.99, "description": "Egg fried rice with scallions"},
                {"name": "Spring Rolls (4)", "price": 5.99, "description": "Crispy veggie spring rolls"},
            ],
        },
        {
            "name": "Smoothie Bar",
            "category": "beverage",
            "location": "Gate D — West Stand",
            "description": "Fresh fruit smoothies and protein shakes",
            "avg_service_time": 3,
            "image_url": "/stalls/smoothie.jpg",
            "menu": [
                {"name": "Mango Smoothie", "price": 5.99, "description": "Fresh mango, banana, yogurt"},
                {"name": "Berry Blast", "price": 5.99, "description": "Mixed berries, honey, ice"},
                {"name": "Protein Shake", "price": 6.99, "description": "Banana, peanut butter, protein"},
            ],
        },
    ]

    for s in stalls_data:
        stall = Stall(
            name=s["name"],
            category=s["category"],
            location=s["location"],
            description=s["description"],
            avg_service_time=s["avg_service_time"],
            image_url=s["image_url"],
        )
        db.add(stall)
        db.flush()

        for item in s["menu"]:
            mi = MenuItem(
                stall_id=stall.id,
                name=item["name"],
                price=item["price"],
                description=item["description"],
            )
            db.add(mi)

    db.commit()
    print(f"✅ Seeded {len(stalls_data)} stalls with menus")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        seed_stalls(db)
    finally:
        db.close()

    sim_task = asyncio.create_task(run_simulation())
    print("🚀 AccessPass backend started — simulation running")

    yield

    stop_simulation()
    sim_task.cancel()
    print("🛑 AccessPass backend stopped")


app = FastAPI(
    title="AccessPass API",
    description="Smart Stadium Service Access Layer",
    version="1.0.0",
    lifespan=lifespan,
)

# ✅ FIXED CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # IMPORTANT for Vercel frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_router)
app.include_router(stalls_router)
app.include_router(orders_router)
app.include_router(vendor_router)


@app.get("/suggestions", tags=["AI"])
def suggestions(section: str = "A"):
    db = SessionLocal()
    try:
        stalls = db.query(Stall).filter(Stall.is_open == True).all()
        stalls_data = []
        for s in stalls:
            active = (
                db.query(Order)
                .filter(Order.stall_id == s.id, Order.status.in_(["queued", "preparing"]))
                .count()
            )
            stalls_data.append({
                "id": s.id,
                "name": s.name,
                "category": s.category,
                "location": s.location,
                "wait_time": active * s.avg_service_time,
                "active_orders": active,
                "rush_status": "🔥 Rush" if active > 8 else None,
            })
        return get_stall_suggestions(stalls_data, section)
    finally:
        db.close()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "connections": manager.count,
        "service": "AccessPass API",
    }