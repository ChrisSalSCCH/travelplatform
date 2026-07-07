from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import WorkPackage
from app.schemas import WorkPackageCreate, WorkPackageUpdate, WorkPackageResponse
import uuid

router = APIRouter(prefix="/workpackages", tags=["workpackages"])


@router.get("", response_model=list[WorkPackageResponse])
def list_workpackages(
    project_id: Optional[str] = Query(None),
    active_only: bool = False,
    db: Session = Depends(get_db),
):
    q = db.query(WorkPackage).filter(WorkPackage.deleted_at.is_(None))
    if project_id:
        q = q.filter(WorkPackage.project_id == project_id)
    if active_only:
        q = q.filter(WorkPackage.active.is_(True))
    return q.order_by(WorkPackage.code).all()


@router.post("", response_model=WorkPackageResponse, status_code=201)
def create_workpackage(body: WorkPackageCreate, db: Session = Depends(get_db)):
    existing = db.query(WorkPackage).filter(
        WorkPackage.project_id == body.project_id,
        WorkPackage.code == body.code,
        WorkPackage.deleted_at.is_(None),
    ).first()
    if existing:
        raise HTTPException(400, f"Work package code '{body.code}' already exists for this project")
    wp = WorkPackage(id=str(uuid.uuid4()), **body.model_dump())
    db.add(wp)
    db.commit()
    db.refresh(wp)
    return wp


@router.patch("/{wp_id}", response_model=WorkPackageResponse)
def update_workpackage(wp_id: str, body: WorkPackageUpdate, db: Session = Depends(get_db)):
    wp = db.query(WorkPackage).filter(WorkPackage.id == wp_id, WorkPackage.deleted_at.is_(None)).first()
    if not wp:
        raise HTTPException(404, "Work package not found")
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(wp, key, val)
    wp.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(wp)
    return wp


@router.delete("/{wp_id}", status_code=204)
def delete_workpackage(wp_id: str, db: Session = Depends(get_db)):
    wp = db.query(WorkPackage).filter(WorkPackage.id == wp_id, WorkPackage.deleted_at.is_(None)).first()
    if not wp:
        raise HTTPException(404, "Work package not found")
    wp.deleted_at = datetime.now(timezone.utc)
    db.commit()
