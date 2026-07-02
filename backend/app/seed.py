from decimal import Decimal
from sqlalchemy.orm import Session
from app.models import DailyRate, Project
import uuid


RATE_SEEDS = [
    {
        "key": "mileage_car",
        "label": "Mileage allowance (car)",
        "amount": Decimal("0.42"),
        "unit": "per km",
        "notes": "§ 26 EStG — 0.42 €/km for private car, max. 30,000 km/year eligible for FFG funding",
    },
    {
        "key": "daily_allowance_domestic",
        "label": "Daily allowance (domestic)",
        "amount": Decimal("26.40"),
        "unit": "per day",
        "notes": "Full rate for trips > 12h; pro-rated from 3h onwards (§ 26 EStG / Austrian travel expense law)",
    },
    {
        "key": "daily_allowance_abroad",
        "label": "Daily allowance (abroad)",
        "amount": Decimal("35.80"),
        "unit": "per day",
        "notes": "Standard EU rate; country-specific rates apply per BMF table",
    },
    {
        "key": "overnight_allowance",
        "label": "Overnight allowance (without receipt)",
        "amount": Decimal("15.00"),
        "unit": "per night",
        "notes": "Flat rate; actual hotel receipt can be claimed instead",
    },
    {
        "key": "mileage_bike",
        "label": "Mileage allowance (bicycle)",
        "amount": Decimal("0.38"),
        "unit": "per km",
        "notes": "§ 26 EStG — 0.38 €/km for bicycle",
    },
]

PROJECT_SEEDS = [
    {"code": "COMET-K1", "name": "COMET K1 Centre SCCH", "funder": "FFG", "active": True},
    {"code": "BRIDGE", "name": "BRIDGE Programme Project", "funder": "FFG", "active": True},
    {"code": "INTERNAL", "name": "Internal / Non-funded", "funder": "OTHER", "active": True},
]


def seed_database(db: Session) -> None:
    for rate_data in RATE_SEEDS:
        existing = db.query(DailyRate).filter(DailyRate.key == rate_data["key"]).first()
        if not existing:
            rate = DailyRate(id=str(uuid.uuid4()), **rate_data)
            db.add(rate)

    for proj_data in PROJECT_SEEDS:
        existing = db.query(Project).filter(Project.code == proj_data["code"]).first()
        if not existing:
            proj = Project(id=str(uuid.uuid4()), **proj_data)
            db.add(proj)

    db.commit()
