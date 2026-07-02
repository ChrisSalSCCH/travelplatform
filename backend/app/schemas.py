from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator


# ── Projects ──────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    code: str
    name: str
    funder: str
    active: bool = True

    @field_validator("code")
    @classmethod
    def code_max(cls, v: str) -> str:
        if len(v) > 20:
            raise ValueError("code max 20 characters")
        return v.upper()

    @field_validator("funder")
    @classmethod
    def funder_valid(cls, v: str) -> str:
        if v not in ("FFG", "FWF", "CDG", "OTHER"):
            raise ValueError("funder must be FFG, FWF, CDG or OTHER")
        return v


class ProjectUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    funder: Optional[str] = None
    active: Optional[bool] = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    code: str
    name: str
    funder: str
    active: bool
    created_at: datetime
    updated_at: datetime


# ── Expense Items ─────────────────────────────────────────────────────────────

class ExpenseItemCreate(BaseModel):
    category: str
    date: date
    description: str
    km: Optional[Decimal] = None
    amount: Decimal
    receipt_url: Optional[str] = None

    @field_validator("category")
    @classmethod
    def category_valid(cls, v: str) -> str:
        allowed = ("daily_allowance", "mileage", "accommodation", "transport", "other")
        if v not in allowed:
            raise ValueError(f"category must be one of {allowed}")
        return v

    @field_validator("description")
    @classmethod
    def desc_max(cls, v: str) -> str:
        if len(v) > 400:
            raise ValueError("description max 400 characters")
        return v


class ExpenseItemUpdate(BaseModel):
    category: Optional[str] = None
    date: Optional[date] = None
    description: Optional[str] = None
    km: Optional[Decimal] = None
    amount: Optional[Decimal] = None
    receipt_url: Optional[str] = None


class ExpenseItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    request_id: str
    category: str
    date: date
    description: str
    km: Optional[Decimal]
    amount: Decimal
    receipt_url: Optional[str]
    created_at: datetime
    updated_at: datetime


# ── Travel Requests ───────────────────────────────────────────────────────────

class TravelRequestCreate(BaseModel):
    employee_name: str
    employee_email: str
    department: str
    destination: str
    purpose: str
    trip_start: date
    trip_end: date
    project_id: str

    @field_validator("employee_name", "department", "destination")
    @classmethod
    def max_200(cls, v: str) -> str:
        if len(v) > 200:
            raise ValueError("max 200 characters")
        return v

    @field_validator("purpose")
    @classmethod
    def max_500(cls, v: str) -> str:
        if len(v) > 500:
            raise ValueError("max 500 characters")
        return v


class TravelRequestUpdate(BaseModel):
    employee_name: Optional[str] = None
    employee_email: Optional[str] = None
    department: Optional[str] = None
    destination: Optional[str] = None
    purpose: Optional[str] = None
    trip_start: Optional[date] = None
    trip_end: Optional[date] = None
    project_id: Optional[str] = None


class TravelRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    employee_name: str
    employee_email: str
    department: str
    destination: str
    purpose: str
    trip_start: date
    trip_end: date
    project_id: str
    status: str
    rejection_reason: Optional[str]
    created_at: datetime
    updated_at: datetime
    items: list[ExpenseItemResponse] = []
    project: Optional[ProjectResponse] = None


class RejectBody(BaseModel):
    reason: str


# ── Daily Rates ───────────────────────────────────────────────────────────────

class DailyRateUpdate(BaseModel):
    label: Optional[str] = None
    amount: Optional[Decimal] = None
    unit: Optional[str] = None
    notes: Optional[str] = None


class DailyRateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    key: str
    label: str
    amount: Decimal
    unit: str
    notes: Optional[str]
    updated_at: datetime
