import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import TravelRequest, ExpenseItem, DailyRate, RouteLeg, CarPassenger, DailyAllowanceDay
from app.schemas import (
    TravelRequestCreate, TravelRequestUpdate, TravelRequestResponse,
    ExpenseItemCreate, ExpenseItemUpdate, ExpenseItemResponse,
    RouteLegCreate, RouteLegResponse,
    CarPassengerCreate, CarPassengerResponse,
    DailyAllowanceDayCreate, DailyAllowanceDayResponse,
    RejectBody, ItemApproveBody,
)
import uuid

router = APIRouter(prefix="/requests", tags=["requests"])


def _load(request_id: str, db: Session) -> TravelRequest:
    req = (
        db.query(TravelRequest)
        .options(
            joinedload(TravelRequest.items),
            joinedload(TravelRequest.project),
            joinedload(TravelRequest.route_legs),
            joinedload(TravelRequest.passengers),
            joinedload(TravelRequest.allowance_days),
        )
        .filter(TravelRequest.id == request_id, TravelRequest.deleted_at.is_(None))
        .first()
    )
    if not req:
        raise HTTPException(404, "Travel request not found")
    return req


@router.get("/last-odometer")
def last_odometer(
    first_name: str = Query(...),
    last_name: str = Query(...),
    db: Session = Depends(get_db),
):
    """Return the odometer_end from the most recent car trip by this person."""
    req = (
        db.query(TravelRequest)
        .filter(
            TravelRequest.first_name.ilike(first_name),
            TravelRequest.last_name.ilike(last_name),
            TravelRequest.deleted_at.is_(None),
        )
        .order_by(TravelRequest.created_at.desc())
        .first()
    )
    if not req:
        return {"odometer_end": None}
    # Find latest route leg with odometer_end
    leg = (
        db.query(RouteLeg)
        .filter(RouteLeg.request_id == req.id, RouteLeg.odometer_end.isnot(None))
        .order_by(RouteLeg.leg_order.desc())
        .first()
    )
    return {"odometer_end": float(leg.odometer_end) if leg and leg.odometer_end else None}


@router.get("", response_model=list[TravelRequestResponse])
def list_requests(
    status: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(TravelRequest)
        .options(
            joinedload(TravelRequest.items), joinedload(TravelRequest.project),
            joinedload(TravelRequest.route_legs), joinedload(TravelRequest.passengers),
            joinedload(TravelRequest.allowance_days),
        )
        .filter(TravelRequest.deleted_at.is_(None))
    )
    if status: q = q.filter(TravelRequest.status == status)
    if project_id: q = q.filter(TravelRequest.project_id == project_id)
    if search:
        term = f"%{search}%"
        q = q.filter(
            TravelRequest.first_name.ilike(term) | TravelRequest.last_name.ilike(term)
            | TravelRequest.employee_name.ilike(term) | TravelRequest.employee_email.ilike(term)
        )
    return q.order_by(TravelRequest.created_at.desc()).all()


@router.post("", response_model=TravelRequestResponse, status_code=201)
def create_request(body: TravelRequestCreate, db: Session = Depends(get_db)):
    data = body.model_dump()
    data["employee_name"] = f"{body.first_name} {body.last_name}".strip()
    req = TravelRequest(id=str(uuid.uuid4()), status="draft", **data)
    db.add(req); db.commit()
    return _load(req.id, db)


@router.get("/{request_id}", response_model=TravelRequestResponse)
def get_request(request_id: str, db: Session = Depends(get_db)):
    return _load(request_id, db)


@router.patch("/{request_id}", response_model=TravelRequestResponse)
def update_request(request_id: str, body: TravelRequestUpdate, db: Session = Depends(get_db)):
    req = _load(request_id, db)
    if req.status != "draft": raise HTTPException(400, "Only draft requests can be edited")
    updates = body.model_dump(exclude_unset=True)
    for key, val in updates.items(): setattr(req, key, val)
    if "first_name" in updates or "last_name" in updates:
        req.employee_name = f"{req.first_name} {req.last_name}".strip()
    req.updated_at = datetime.now(timezone.utc)
    db.commit()
    return _load(request_id, db)


@router.post("/{request_id}/submit", response_model=TravelRequestResponse)
def submit_request(request_id: str, db: Session = Depends(get_db)):
    req = _load(request_id, db)
    if req.status != "draft": raise HTTPException(400, "Only draft requests can be submitted")
    req.status = "submitted"; req.updated_at = datetime.now(timezone.utc)
    db.commit(); return _load(request_id, db)


@router.post("/{request_id}/approve", response_model=TravelRequestResponse)
def approve_request(request_id: str, db: Session = Depends(get_db)):
    req = _load(request_id, db)
    if req.status != "submitted": raise HTTPException(400, "Only submitted requests can be approved")
    req.status = "approved"; req.updated_at = datetime.now(timezone.utc)
    db.commit(); return _load(request_id, db)


@router.post("/{request_id}/reject", response_model=TravelRequestResponse)
def reject_request(request_id: str, body: RejectBody, db: Session = Depends(get_db)):
    req = _load(request_id, db)
    if req.status != "submitted": raise HTTPException(400, "Only submitted requests can be rejected")
    req.status = "rejected"; req.rejection_reason = body.reason
    req.updated_at = datetime.now(timezone.utc)
    db.commit(); return _load(request_id, db)


@router.post("/{request_id}/route", response_model=list[RouteLegResponse], status_code=201)
def save_route_legs(request_id: str, legs: list[RouteLegCreate], db: Session = Depends(get_db)):
    req = _load(request_id, db)
    db.query(RouteLeg).filter(RouteLeg.request_id == request_id).delete()
    new_legs = []
    for i, leg in enumerate(legs):
        rl = RouteLeg(
            id=str(uuid.uuid4()), request_id=request_id,
            leg_order=leg.leg_order or i, origin=leg.origin, destination=leg.destination,
            waypoints=json.dumps(leg.waypoints) if leg.waypoints else None,
            distance_km=leg.distance_km, duration_min=leg.duration_min,
            return_trip=leg.return_trip, odometer_end=leg.odometer_end,
        )
        db.add(rl); new_legs.append(rl)
    req.updated_at = datetime.now(timezone.utc)
    db.commit()
    for leg in new_legs: db.refresh(leg)
    return new_legs


@router.post("/{request_id}/passengers", response_model=list[CarPassengerResponse], status_code=201)
def save_passengers(request_id: str, passengers: list[CarPassengerCreate], db: Session = Depends(get_db)):
    req = _load(request_id, db)
    db.query(CarPassenger).filter(CarPassenger.request_id == request_id).delete()
    new_list = []
    for p in passengers:
        cp = CarPassenger(id=str(uuid.uuid4()), request_id=request_id, name=p.name, km=p.km)
        db.add(cp); new_list.append(cp)
    req.updated_at = datetime.now(timezone.utc)
    db.commit()
    for p in new_list: db.refresh(p)
    return new_list


@router.post("/{request_id}/allowance-days", response_model=list[DailyAllowanceDayResponse], status_code=201)
def save_allowance_days(request_id: str, days: list[DailyAllowanceDayCreate], db: Session = Depends(get_db)):
    req = _load(request_id, db)
    db.query(DailyAllowanceDay).filter(DailyAllowanceDay.request_id == request_id).delete()
    new_list = []
    for d in days:
        ad = DailyAllowanceDay(
            id=str(uuid.uuid4()), request_id=request_id, day=d.day,
            is_abroad=d.is_abroad, meal_breakfast=d.meal_breakfast,
            meal_lunch=d.meal_lunch, meal_dinner=d.meal_dinner,
            allowance_amount=d.allowance_amount,
        )
        db.add(ad); new_list.append(ad)
    req.updated_at = datetime.now(timezone.utc)
    db.commit()
    for d in new_list: db.refresh(d)
    return new_list


items_router = APIRouter(prefix="/items", tags=["items"])


def _calc_amount(category: str, km: Optional[Decimal], amount: Decimal, db: Session) -> Decimal:
    if category == "mileage" and km is not None:
        rate = db.query(DailyRate).filter(DailyRate.key == "mileage_car").first()
        if rate: return Decimal(str(km)) * rate.amount
    return amount


@router.post("/{request_id}/items", response_model=ExpenseItemResponse, status_code=201)
def add_item(request_id: str, body: ExpenseItemCreate, db: Session = Depends(get_db)):
    req = _load(request_id, db)
    if req.status not in ("draft",): raise HTTPException(400, "Items can only be added to draft requests")
    computed_amount = _calc_amount(body.category, body.km, body.amount, db)
    item = ExpenseItem(
        id=str(uuid.uuid4()), request_id=request_id,
        category=body.category, date=body.date, description=body.description,
        km=body.km, amount=computed_amount, receipt_url=body.receipt_url,
        paid_privately=body.paid_privately,
    )
    db.add(item); req.updated_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(item)
    return item


@items_router.patch("/{item_id}", response_model=ExpenseItemResponse)
def update_item(item_id: str, body: ExpenseItemUpdate, db: Session = Depends(get_db)):
    item = db.query(ExpenseItem).filter(ExpenseItem.id == item_id, ExpenseItem.deleted_at.is_(None)).first()
    if not item: raise HTTPException(404, "Item not found")
    for key, val in body.model_dump(exclude_unset=True).items(): setattr(item, key, val)
    if item.category == "mileage" and item.km is not None:
        rate = db.query(DailyRate).filter(DailyRate.key == "mileage_car").first()
        if rate: item.amount = Decimal(str(item.km)) * rate.amount
    item.updated_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(item)
    return item


@items_router.patch("/{item_id}/approve", response_model=ExpenseItemResponse)
def approve_item(item_id: str, body: ItemApproveBody, db: Session = Depends(get_db)):
    item = db.query(ExpenseItem).filter(ExpenseItem.id == item_id, ExpenseItem.deleted_at.is_(None)).first()
    if not item: raise HTTPException(404, "Item not found")
    item.receipt_approved = True
    item.kreditor = body.kreditor
    if body.approved_amount is not None:
        item.approved_amount = body.approved_amount
        item.approval_comment = body.approval_comment
    if body.vat_rate is not None:
        item.vat_rate = body.vat_rate
    item.updated_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(item)
    return item


@items_router.patch("/{item_id}/reject", response_model=ExpenseItemResponse)
def reject_item(item_id: str, db: Session = Depends(get_db)):
    item = db.query(ExpenseItem).filter(ExpenseItem.id == item_id, ExpenseItem.deleted_at.is_(None)).first()
    if not item: raise HTTPException(404, "Item not found")
    item.receipt_approved = False
    item.updated_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(item)
    return item


@items_router.delete("/{item_id}", status_code=204)
def delete_item(item_id: str, db: Session = Depends(get_db)):
    item = db.query(ExpenseItem).filter(ExpenseItem.id == item_id, ExpenseItem.deleted_at.is_(None)).first()
    if not item: raise HTTPException(404, "Item not found")
    item.deleted_at = datetime.now(timezone.utc); db.commit()
