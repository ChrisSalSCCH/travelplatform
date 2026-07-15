from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlalchemy import (
    String, Text, Boolean, Numeric, Date, Integer,
    ForeignKey, CheckConstraint, Index, DateTime, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import uuid


def now_utc():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="employee")
    password_hash: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=now_utc, onupdate=now_utc, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    __table_args__ = (
        CheckConstraint("role IN ('employee','approver','admin')", name="ck_user_role"),
        Index("ix_users_email", "email"),
        Index("ix_users_deleted_at", "deleted_at"),
    )


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    funder: Mapped[str] = mapped_column(String(10), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=now_utc, onupdate=now_utc, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    requests: Mapped[list["TravelRequest"]] = relationship(back_populates="project")
    pre_requests: Mapped[list["TravelPreRequest"]] = relationship(back_populates="project")
    work_packages: Mapped[list["WorkPackage"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    __table_args__ = (
        CheckConstraint("funder IN ('FFG','FWF','CDG','OTHER')", name="ck_project_funder"),
        Index("ix_projects_deleted_at", "deleted_at"),
    )


class WorkPackage(Base):
    __tablename__ = "work_packages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=now_utc, onupdate=now_utc, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    project: Mapped["Project"] = relationship(back_populates="work_packages")
    __table_args__ = (
        UniqueConstraint("project_id", "code", name="uq_wp_project_code"),
        Index("ix_wp_project_id", "project_id"),
        Index("ix_wp_deleted_at", "deleted_at"),
    )


class TravelRequest(Base):
    __tablename__ = "travel_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    first_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    last_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    employee_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    employee_email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    destination: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    purpose: Mapped[str] = mapped_column(String(500), nullable=False)
    work_package: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    trip_start: Mapped[datetime] = mapped_column(Date, nullable=False)
    trip_end: Mapped[datetime] = mapped_column(Date, nullable=False)
    departure_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    return_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    meal_breakfast: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    meal_lunch: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    meal_dinner: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=now_utc, onupdate=now_utc, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    project: Mapped["Project"] = relationship(back_populates="requests")
    items: Mapped[list["ExpenseItem"]] = relationship(back_populates="request", cascade="all, delete-orphan")
    route_legs: Mapped[list["RouteLeg"]] = relationship(back_populates="request", cascade="all, delete-orphan", order_by="RouteLeg.leg_order")
    passengers: Mapped[list["CarPassenger"]] = relationship(back_populates="request", cascade="all, delete-orphan")
    allowance_days: Mapped[list["DailyAllowanceDay"]] = relationship(back_populates="request", cascade="all, delete-orphan", order_by="DailyAllowanceDay.day")
    __table_args__ = (
        CheckConstraint("status IN ('draft','submitted','approved','rejected')", name="ck_request_status"),
        Index("ix_requests_status", "status"),
        Index("ix_requests_project_id", "project_id"),
        Index("ix_requests_deleted_at", "deleted_at"),
    )


class TravelPreRequest(Base):
    """Pre-trip travel request — submitted before the trip for approval."""
    __tablename__ = "travel_pre_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    last_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    employee_email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="RESTRICT"), nullable=False)
    work_package: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    destination: Mapped[str] = mapped_column(String(300), nullable=False)
    purpose: Mapped[str] = mapped_column(String(500), nullable=False)
    travel_start: Mapped[datetime] = mapped_column(Date, nullable=False)
    travel_end: Mapped[datetime] = mapped_column(Date, nullable=False)
    estimated_km: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    estimated_nights: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    estimated_other_costs: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="submitted")
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=now_utc, onupdate=now_utc, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    project: Mapped["Project"] = relationship(back_populates="pre_requests")
    __table_args__ = (
        CheckConstraint("status IN ('submitted','approved','rejected')", name="ck_pre_request_status"),
        Index("ix_pre_requests_status", "status"),
        Index("ix_pre_requests_project_id", "project_id"),
        Index("ix_pre_requests_deleted_at", "deleted_at"),
    )


class CarPassenger(Base):
    __tablename__ = "car_passengers"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id: Mapped[str] = mapped_column(ForeignKey("travel_requests.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    km: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=now_utc, nullable=False)
    request: Mapped["TravelRequest"] = relationship(back_populates="passengers")
    __table_args__ = (Index("ix_passengers_request_id", "request_id"),)


class DailyAllowanceDay(Base):
    __tablename__ = "daily_allowance_days"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id: Mapped[str] = mapped_column(ForeignKey("travel_requests.id", ondelete="CASCADE"), nullable=False)
    day: Mapped[datetime] = mapped_column(Date, nullable=False)
    is_abroad: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    meal_breakfast: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    meal_lunch: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    meal_dinner: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    allowance_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=now_utc, nullable=False)
    request: Mapped["TravelRequest"] = relationship(back_populates="allowance_days")
    __table_args__ = (Index("ix_allowance_days_request_id", "request_id"),)


class RouteLeg(Base):
    __tablename__ = "route_legs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id: Mapped[str] = mapped_column(ForeignKey("travel_requests.id", ondelete="CASCADE"), nullable=False)
    leg_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    origin: Mapped[str] = mapped_column(String(400), nullable=False)
    destination: Mapped[str] = mapped_column(String(400), nullable=False)
    waypoints: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    distance_km: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    duration_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    return_trip: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    odometer_end: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 1), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=now_utc, nullable=False)
    request: Mapped["TravelRequest"] = relationship(back_populates="route_legs")
    __table_args__ = (Index("ix_route_legs_request_id", "request_id"),)


class ExpenseItem(Base):
    __tablename__ = "expense_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id: Mapped[str] = mapped_column(ForeignKey("travel_requests.id", ondelete="CASCADE"), nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    date: Mapped[datetime] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(String(400), nullable=False)
    km: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    receipt_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    paid_privately: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    receipt_approved: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)  # None=pending, True=approved, False=rejected
    kreditor: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    approved_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    approval_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    vat_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=now_utc, onupdate=now_utc, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    request: Mapped["TravelRequest"] = relationship(back_populates="items")
    __table_args__ = (
        CheckConstraint("category IN ('daily_allowance','mileage','accommodation','transport','other')", name="ck_item_category"),
        Index("ix_items_request_id", "request_id"),
        Index("ix_items_deleted_at", "deleted_at"),
    )


class DailyRate(Base):
    __tablename__ = "daily_rates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=now_utc, onupdate=now_utc, nullable=False)
