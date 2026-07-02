import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, SessionLocal
from app.models import Base
from app.seed import seed_database
from app.routers import projects, requests, rates, upload
from app.routers.requests import items_router

Base.metadata.create_all(bind=engine)

# Seed on startup
with SessionLocal() as db:
    seed_database(db)

app = FastAPI(title="SCCH Travel Expenses API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api")
app.include_router(requests.router, prefix="/api")
app.include_router(items_router, prefix="/api")
app.include_router(rates.router, prefix="/api")
app.include_router(upload.router, prefix="/api")

# Serve uploaded files
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/api/files", StaticFiles(directory=UPLOAD_DIR), name="files")


@app.get("/api/health")
def health():
    return {"status": "ok"}
