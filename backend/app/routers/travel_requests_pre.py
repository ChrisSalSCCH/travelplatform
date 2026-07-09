import uuid
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import TravelPreRequest, Project
from app.routers.auth import get_current_user, get_current_user_optional
from app.models import User

router = APIRouter(prefix="/travel-requests", tags=["travel-requests"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class PreRequestCreate(BaseModel):
    project_id: str
    work_package: Optional[str] = None
    destination: str
    purpose: str
    travel_start: date
    travel_end: date
    estimated_km: Optional[Decimal] = None
    estimated_nights: Optional[int] = None
    estimated_other_costs: Optional[Decimal] = None
    notes: Optional[str] = None


class PreRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: Optional[str]
    first_name: str
    last_name: str
    employee_email: Optional[str]
    department: Optional[str]
    project_id: str
    work_package: Optional[str]
    destination: str
    purpose: str
    travel_start: date
    travel_end: date
    estimated_km: Optional[Decimal]
    estimated_nights: Optional[int]
    estimated_other_costs: Optional[Decimal]
    notes: Optional[str]
    status: str
    rejection_reason: Optional[str]
    created_at: datetime
    updated_at: datetime
    project: Optional["ProjectMini"] = None


class ProjectMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    code: str
    name: str
    funder: str


PreRequestResponse.model_rebuild()


class RejectBody(BaseModel):
    reason: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[PreRequestResponse])
def list_pre_requests(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    q = db.query(TravelPreRequest).filter(TravelPreRequest.deleted_at.is_(None))
    if status:
        q = q.filter(TravelPreRequest.status == status)
    # Non-admin/approver users only see their own requests
    if current_user and current_user.role == "employee":
        q = q.filter(TravelPreRequest.user_id == current_user.id)
    return q.order_by(TravelPreRequest.created_at.desc()).all()


@router.post("", response_model=PreRequestResponse, status_code=201)
def create_pre_request(
    body: PreRequestCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    proj = db.query(Project).filter(Project.id == body.project_id, Project.deleted_at.is_(None)).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    first_name = current_user.first_name if current_user else "Guest"
    last_name = current_user.last_name if current_user else ""
    email = current_user.email if current_user else None
    dept = current_user.department if current_user else None
    user_id = current_user.id if current_user else None

    obj = TravelPreRequest(
        id=str(uuid.uuid4()),
        user_id=user_id,
        first_name=first_name,
        last_name=last_name,
        employee_email=email,
        department=dept,
        **body.model_dump(),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{req_id}", response_model=PreRequestResponse)
def get_pre_request(req_id: str, db: Session = Depends(get_db)):
    obj = db.query(TravelPreRequest).filter(
        TravelPreRequest.id == req_id,
        TravelPreRequest.deleted_at.is_(None),
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    return obj


@router.patch("/{req_id}/approve", response_model=PreRequestResponse)
def approve_pre_request(
    req_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("approver", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    obj = db.query(TravelPreRequest).filter(TravelPreRequest.id == req_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    obj.status = "approved"
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{req_id}/reject", response_model=PreRequestResponse)
def reject_pre_request(
    req_id: str,
    body: RejectBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("approver", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    obj = db.query(TravelPreRequest).filter(TravelPreRequest.id == req_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    obj.status = "rejected"
    obj.rejection_reason = body.reason
    db.commit()
    db.refresh(obj)
    return obj
