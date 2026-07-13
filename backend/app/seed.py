import hashlib
import hmac
import secrets
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models import DailyRate, Project, WorkPackage, User
import uuid


# Rates as of 2026 (BGBl. II Nr. 395/2025)
RATE_SEEDS = [
    {"key": "mileage_car", "label": "Mileage allowance (car / driver)", "amount": Decimal("0.50"), "unit": "per km",
     "notes": "§ 26 EStG — 0.50 €/km for private car driver, max. 30,000 km/year eligible for FFG funding"},
    {"key": "mileage_passenger", "label": "Mileage allowance (passenger surcharge)", "amount": Decimal("0.15"), "unit": "per km per passenger",
     "notes": "§ 26 EStG — additional 0.15 €/km per passenger carried"},
    {"key": "daily_allowance_domestic", "label": "Daily allowance (domestic)", "amount": Decimal("30.00"), "unit": "per day",
     "notes": "Ab 2026 (BGBl. II Nr. 395/2025): Voller Satz > 12h; halber Satz 3-12h. Kuerzung um je 1/3 pro eingeladener Mahlzeit (§ 26 EStG)"},
    {"key": "daily_allowance_abroad", "label": "Daily allowance (abroad)", "amount": Decimal("41.40"), "unit": "per day",
     "notes": "Ab 2026 (BGBl. II Nr. 395/2025): Standardsatz EU/Ausland; laenderspezifische Saetze gemaess BMF-Tabelle"},
    {"key": "overnight_allowance", "label": "Overnight allowance (without receipt)", "amount": Decimal("17.00"), "unit": "per night",
     "notes": "Ab 2026 (BGBl. II Nr. 395/2025): Pauschale ohne Beleg; tatsaechliche Hotelrechnung alternativ abrechenbar"},
    {"key": "mileage_bike", "label": "Mileage allowance (bicycle)", "amount": Decimal("0.38"), "unit": "per km",
     "notes": "§ 26 EStG — 0.38 €/km for bicycle"},
]

PROJECT_SEEDS = [
    {"code": "COMET-K1", "name": "COMET K1 Centre SCCH", "funder": "FFG", "active": True},
    {"code": "BRIDGE", "name": "BRIDGE Programme Project", "funder": "FFG", "active": True},
    {"code": "INTERNAL", "name": "Internal / Non-funded", "funder": "OTHER", "active": True},
]

WP_SEEDS = {
    "COMET-K1": [
        {"code": "WP1", "name": "Project Management"},
        {"code": "WP2", "name": "Research & Development"},
        {"code": "WP3", "name": "Dissemination"},
        {"code": "WP4", "name": "Industry Cooperation"},
    ],
    "BRIDGE": [
        {"code": "WP1", "name": "Requirements Engineering"},
        {"code": "WP2", "name": "Implementation"},
        {"code": "WP3", "name": "Evaluation"},
    ],
    "INTERNAL": [
        {"code": "ADMIN", "name": "Administration"},
        {"code": "SALES", "name": "Sales & Marketing"},
    ],
}


def _hash_password(plain: str) -> str:
    """PBKDF2-HMAC-SHA256 — stdlib only, no passlib/bcrypt needed."""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt.encode(), 260_000)
    return f"pbkdf2:sha256:260000:{salt}:{dk.hex()}"


USER_SEEDS = [
    {
        "email": "demo@scch.at",
        "first_name": "Demo",
        "last_name": "User",
        "department": "Research",
        "role": "employee",
        "password_hash": None,
        "is_demo": True,
    },
    {
        "email": "admin@scch.at",
        "first_name": "Admin",
        "last_name": "SCCH",
        "department": "Management",
        "role": "admin",
        "plain_password": "scch-admin",
        "is_demo": False,
    },
    {
        "email": "approver@scch.at",
        "first_name": "Max",
        "last_name": "Mustermann",
        "department": "Management",
        "role": "approver",
        "plain_password": "scch-approver",
        "is_demo": False,
    },
]


def seed_database(db: Session) -> None:
    # Rates — only insert, never overwrite user-edited values
    for rate_data in RATE_SEEDS:
        existing = db.query(DailyRate).filter(DailyRate.key == rate_data["key"]).first()
        if not existing:
            db.add(DailyRate(id=str(uuid.uuid4()), **rate_data))

    # Projects & work packages
    for proj_data in PROJECT_SEEDS:
        proj = db.query(Project).filter(Project.code == proj_data["code"]).first()
        if not proj:
            proj = Project(id=str(uuid.uuid4()), **proj_data)
            db.add(proj)
            db.flush()
        for wp_data in WP_SEEDS.get(proj_data["code"], []):
            exists = db.query(WorkPackage).filter(
                WorkPackage.project_id == proj.id,
                WorkPackage.code == wp_data["code"],
            ).first()
            if not exists:
                db.add(WorkPackage(id=str(uuid.uuid4()), project_id=proj.id, **wp_data))

    # Seed users — only insert if email not yet present
    for u_orig in USER_SEEDS:
        existing = db.query(User).filter(User.email == u_orig["email"]).first()
        if not existing:
            u = dict(u_orig)  # copy to avoid mutating the global list
            plain_pw = u.pop("plain_password", None)
            pw_hash = _hash_password(plain_pw) if plain_pw else u.pop("password_hash", None)
            db.add(User(id=str(uuid.uuid4()), password_hash=pw_hash, **u))

    db.commit()
