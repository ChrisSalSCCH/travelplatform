from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class ProjectCreate(BaseModel):
    code: str; name: str; funder: str; active: bool = True
    @field_validator("code")
    @classmethod
    def code_max(cls, v: str) -> str:
        if len(v) > 20: raise ValueError("code max 20 characters")
        return v.upper()
    @field_validator("funder")
    @classmethod
    def funder_valid(cls, v: str) -> str:
        if v not in ("FFG", "FWF", "CDG", "OTHER"): raise ValueError("invalid funder")
        return v

class ProjectUpdate(BaseModel):
    code: Optional[str] = None; name: Optional[str] = None
    funder: Optional[str] = None; active: Optional[bool] = None

class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; code: str; name: str; funder: str; active: bool
    created_at: datetime; updated_at: datetime


class WorkPackageCreate(BaseModel):
    project_id: str; code: str; name: str; active: bool = True
    @field_validator("code")
    @classmethod
    def code_max(cls, v: str) -> str:
        if len(v) > 50: raise ValueError("code max 50 characters")
        return v

class WorkPackageUpdate(BaseModel):
    code: Optional[str] = None; name: Optional[str] = None; active: Optional[bool] = None

class WorkPackageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; project_id: str; code: str; name: str; active: bool
    created_at: datetime; updated_at: datetime


class CarPassengerCreate(BaseModel):
    name: str; km: Decimal
    @field_validator("name")
    @classmethod
    def name_max(cls, v: str) -> str:
        if len(v) > 200: raise ValueError("max 200 chars")
        return v

class CarPassengerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; request_id: str; name: str; km: Decimal; created_at: datetime


class DailyAllowanceDayCreate(BaseModel):
    day: date; is_abroad: bool = False
    meal_breakfast: bool = False; meal_lunch: bool = False; meal_dinner: bool = False
    allowance_amount: Decimal

class DailyAllowanceDayResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; request_id: str; day: date
    is_abroad: bool; meal_breakfast: bool; meal_lunch: bool; meal_dinner: bool
    allowance_amount: Decimal; created_at: datetime


class RouteLegCreate(BaseModel):
    origin: str; destination: str
    waypoints: Optional[list[str]] = None
    distance_km: Optional[Decimal] = None
    duration_min: Optional[int] = None
    return_trip: bool = False
    leg_order: int = 0
    odometer_end: Optional[Decimal] = None

class RouteLegResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; request_id: str; leg_order: int
    origin: str; destination: str; waypoints: Optional[str]
    distance_km: Optional[Decimal]; duration_min: Optional[int]
    return_trip: bool; odometer_end: Optional[Decimal]; created_at: datetime

class RouteCalculateRequest(BaseModel):
    origin: str; destination: str; waypoints: Optional[list[str]] = None

class RouteCalculateResponse(BaseModel):
    distance_km: Optional[float] = None
    duration_min: Optional[int] = None
    error: Optional[str] = None


class ExpenseItemCreate(BaseModel):
    category: str; date: date; description: str
    km: Optional[Decimal] = None; amount: Decimal; receipt_url: Optional[str] = None
    paid_privately: bool = True
    @field_validator("category")
    @classmethod
    def category_valid(cls, v: str) -> str:
        allowed = ("daily_allowance", "mileage", "accommodation", "transport", "other")
        if v not in allowed: raise ValueError(f"must be one of {allowed}")
        return v
    @field_validator("description")
    @classmethod
    def desc_max(cls, v: str) -> str:
        if len(v) > 400: raise ValueError("max 400 chars")
        return v

class ExpenseItemUpdate(BaseModel):
    category: Optional[str] = None; date: Optional[date] = None
    description: Optional[str] = None; km: Optional[Decimal] = None
    amount: Optional[Decimal] = None; receipt_url: Optional[str] = None

class ExpenseItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; request_id: str; category: str; date: date; description: str
    km: Optional[Decimal]; amount: Decimal; receipt_url: Optional[str]
    paid_privately: bool; receipt_approved: Optional[bool]
    created_at: datetime; updated_at: datetime


class TravelRequestCreate(BaseModel):
    first_name: str; last_name: str
    employee_email: Optional[str] = None; department: Optional[str] = None
    destination: Optional[str] = None; purpose: str; work_package: Optional[str] = None
    trip_start: date; trip_end: date
    departure_time: Optional[datetime] = None; return_time: Optional[datetime] = None
    meal_breakfast: bool = False; meal_lunch: bool = False; meal_dinner: bool = False
    project_id: str
    @field_validator("first_name", "last_name")
    @classmethod
    def max_100(cls, v: str) -> str:
        if len(v) > 100: raise ValueError("max 100 chars")
        return v
    @field_validator("purpose")
    @classmethod
    def max_500(cls, v: str) -> str:
        if len(v) > 500: raise ValueError("max 500 chars")
        return v

class TravelRequestUpdate(BaseModel):
    first_name: Optional[str] = None; last_name: Optional[str] = None
    employee_email: Optional[str] = None; department: Optional[str] = None
    destination: Optional[str] = None; purpose: Optional[str] = None
    work_package: Optional[str] = None; trip_start: Optional[date] = None
    trip_end: Optional[date] = None; departure_time: Optional[datetime] = None
    return_time: Optional[datetime] = None; meal_breakfast: Optional[bool] = None
    meal_lunch: Optional[bool] = None; meal_dinner: Optional[bool] = None
    project_id: Optional[str] = None

class TravelRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; first_name: str; last_name: str; employee_name: str
    employee_email: Optional[str]; department: Optional[str]; destination: Optional[str]
    purpose: str; work_package: Optional[str]
    trip_start: date; trip_end: date
    departure_time: Optional[datetime]; return_time: Optional[datetime]
    meal_breakfast: bool; meal_lunch: bool; meal_dinner: bool
    project_id: str; status: str; rejection_reason: Optional[str]
    created_at: datetime; updated_at: datetime
    items: list[ExpenseItemResponse] = []
    route_legs: list[RouteLegResponse] = []
    passengers: list[CarPassengerResponse] = []
    allowance_days: list[DailyAllowanceDayResponse] = []
    project: Optional[ProjectResponse] = None

class RejectBody(BaseModel):
    reason: str

class DailyRateUpdate(BaseModel):
    label: Optional[str] = None; amount: Optional[Decimal] = None
    unit: Optional[str] = None; notes: Optional[str] = None

class DailyRateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str; key: str; label: str; amount: Decimal; unit: str
    notes: Optional[str]; updated_at: datetime
