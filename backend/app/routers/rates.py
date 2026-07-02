from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import DailyRate
from app.schemas import DailyRateUpdate, DailyRateResponse

router = APIRouter(prefix="/rates", tags=["rates"])


@router.get("", response_model=list[DailyRateResponse])
def list_rates(db: Session = Depends(get_db)):
    return db.query(DailyRate).order_by(DailyRate.key).all()


@router.patch("/{rate_id}", response_model=DailyRateResponse)
def update_rate(rate_id: str, body: DailyRateUpdate, db: Session = Depends(get_db)):
    rate = db.query(DailyRate).filter(DailyRate.id == rate_id).first()
    if not rate:
        raise HTTPException(404, "Rate not found")
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(rate, key, val)
    rate.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(rate)
    return rate
