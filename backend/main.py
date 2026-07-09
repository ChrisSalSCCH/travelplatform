import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, SessionLocal
from app.models import Base
from app.seed import seed_database
from app.migrate import run_migrations
from app.routers import projects, requests, rates, upload
from app.routers.requests import items_router
from app.routers import route, workpackages
from app.routers.extract import router as extract_router
from app.routers.auth import router as auth_router
from app.routers.travel_requests_pre import router as pre_requests_router

Base.metadata.create_all(bind=engine)

with SessionLocal() as db:
    run_migrations(db)

with SessionLocal() as db:
    seed_database(db)

app = FastAPI(title="SCCH Travel Portal API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router,          prefix="/api")
app.include_router(projects.router,      prefix="/api")
app.include_router(requests.router,      prefix="/api")
app.include_router(items_router,         prefix="/api")
app.include_router(rates.router,         prefix="/api")
app.include_router(upload.router,        prefix="/api")
app.include_router(route.router,         prefix="/api")
app.include_router(workpackages.router,  prefix="/api")
app.include_router(extract_router,       prefix="/api")
app.include_router(pre_requests_router,  prefix="/api")

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/api/files", StaticFiles(directory=UPLOAD_DIR), name="files")


@app.get("/api/health")
def health():
    return {"status": "ok"}
