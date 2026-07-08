export type Funder = 'FFG' | 'FWF' | 'CDG' | 'OTHER';
export type RequestStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type ExpenseCategory = 'daily_allowance' | 'mileage' | 'accommodation' | 'transport' | 'other';
export type ReceiptCategory = 'accommodation' | 'transport' | 'other';

export interface Project {
  id: string; code: string; name: string; funder: Funder;
  active: boolean; created_at: string; updated_at: string;
}

export interface WorkPackage {
  id: string; project_id: string; code: string; name: string;
  active: boolean; created_at: string; updated_at: string;
}

export interface RouteLeg {
  id: string; request_id: string; leg_order: number;
  origin: string; destination: string; waypoints: string | null;
  distance_km: number | null; duration_min: number | null;
  return_trip: boolean; odometer_end: number | null; created_at: string;
}

export interface CarPassenger {
  id: string; request_id: string; name: string; km: number; created_at: string;
}

export interface DailyAllowanceDayRecord {
  id: string; request_id: string; day: string;
  is_abroad: boolean;
  meal_breakfast: boolean; meal_lunch: boolean; meal_dinner: boolean;
  allowance_amount: number; created_at: string;
}

export interface ExpenseItem {
  id: string; request_id: string; category: ExpenseCategory;
  date: string; description: string; km: number | null;
  amount: number; receipt_url: string | null;
  created_at: string; updated_at: string;
}

export interface TravelRequest {
  id: string; first_name: string; last_name: string; employee_name: string;
  employee_email: string | null; department: string | null; destination: string | null;
  purpose: string; work_package: string | null;
  trip_start: string; trip_end: string;
  departure_time: string | null; return_time: string | null;
  meal_breakfast: boolean; meal_lunch: boolean; meal_dinner: boolean;
  project_id: string; status: RequestStatus; rejection_reason: string | null;
  created_at: string; updated_at: string;
  items: ExpenseItem[];
  route_legs: RouteLeg[];
  passengers: CarPassenger[];
  allowance_days: DailyAllowanceDayRecord[];
  project: Project | null;
}

export interface DailyRate {
  id: string; key: string; label: string;
  amount: number; unit: string; notes: string | null; updated_at: string;
}

export interface ReceiptDraft {
  _id: string; category: ReceiptCategory;
  description: string; amount: string;
  file: File | null; receipt_url: string | null;
  extracting?: boolean;   // VLM in progress
  autoDetected?: boolean; // amount was auto-filled
}

export interface AllowanceDayDraft {
  date: string; label: string;
  isFirstDay: boolean; isLastDay: boolean;
  hours: number; isAbroad: boolean;
  mealBreakfast: boolean; mealLunch: boolean; mealDinner: boolean;
}

export interface PassengerDraft {
  _id: string; name: string; km: string;
}
