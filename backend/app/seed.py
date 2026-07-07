from decimal import Decimal
from sqlalchemy.orm import Session
from app.models import DailyRate, Project, WorkPackage
import uuid


RATE_SEEDS = [
    {"key": "mileage_car", "label": "Mileage allowance (car)", "amount": Decimal("0.42"), "unit": "per km",
     "notes": "§ 26 EStG — 0.42 €/km for private car, max. 30,000 km/year eligible for FFG funding"},
    {"key": "daily_allowance_domestic", "label": "Daily allowance (domestic)", "amount": Decimal("26.40"), "unit": "per day",
     "notes": "Full rate > 12h; half rate 3–12h. Reduced by 1/3 per invited meal (§ 26 EStG)"},
    {"key": "daily_allowance_abroad", "label": "Daily allowance (abroad)", "amount": Decimal("35.80"), "unit": "per day",
     "notes": "Standard EU rate; country-specific rates apply per BMF table"},
    {"key": "overnight_allowance", "label": "Overnight allowance (without receipt)", "amount": Decimal("15.00"), "unit": "per night",
     "notes": "Flat rate; actual hotel receipt can be claimed instead"},
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


def seed_database(db: Session) -> None:
    for rate_data in RATE_SEEDS:
        if not db.query(DailyRate).filter(DailyRate.key == rate_data["key"]).first():
            db.add(DailyRate(id=str(uuid.uuid4()), **rate_data))

    for proj_data in PROJECT_SEEDS:
        proj = db.query(Project).filter(Project.code == proj_data["code"]).first()
        if not proj:
            proj = Project(id=str(uuid.uuid4()), **proj_data)
            db.add(proj)
            db.flush()  # get the id

        # Seed work packages for this project
        for wp_data in WP_SEEDS.get(proj_data["code"], []):
            exists = db.query(WorkPackage).filter(
                WorkPackage.project_id == proj.id,
                WorkPackage.code == wp_data["code"],
            ).first()
            if not exists:
                db.add(WorkPackage(id=str(uuid.uuid4()), project_id=proj.id, **wp_data))

    db.commit()
