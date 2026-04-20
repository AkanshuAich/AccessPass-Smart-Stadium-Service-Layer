import os
from dotenv import load_dotenv

load_dotenv()

# JWT
JWT_SECRET = os.getenv("JWT_SECRET", "accesspass-hackathon-secret-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# Database
# For Render persistent disk, we use /data/accesspass.db
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./accesspass.db")

# Ensure the database directory exists (important for Render /data mount)
if DATABASE_URL.startswith("sqlite:///"):
    db_path = DATABASE_URL.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

# Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# CORS
# In production, this should be your Render frontend URL
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:4173", # Vite preview
]
