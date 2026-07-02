from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Project
from app.schemas import ProjectCreate, ProjectUpdate, ProjectResponse
import uuid

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
def list_projects(active_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(Project).filter(Project.deleted_at.is_(None))
    if active_only:
        q = q.filter(Project.active.is_(True))
    return q.order_by(Project.name).all()


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    if db.query(Project).filter(Project.code == body.code, Project.deleted_at.is_(None)).first():
        raise HTTPException(400, f"Project code '{body.code}' already exists")
    project = Project(id=str(uuid.uuid4()), **body.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, body: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.deleted_at.is_(None)).first()
    if not project:
        raise HTTPException(404, "Project not found")
    for key, val in body.model_dump(exclude_unset=True).items():
        setattr(project, key, val)
    project.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.deleted_at.is_(None)).first()
    if not project:
        raise HTTPException(404, "Project not found")
    project.deleted_at = datetime.now(timezone.utc)
    db.commit()
