export type Funder = 'FFG' | 'FWF' | 'CDG' | 'OTHER';
export type RequestStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type ExpenseCategory =
  | 'daily_allowance'
  | 'mileage'
  | 'accommodation'
  | 'transport'
  | 'other';

export interface Project {
  id: string;
  code: string;
  name: string;
  funder: Funder;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseItem {
  id: string;
  request_id: string;
  category: ExpenseCategory;
  date: string;
  description: string;
  km: number | null;
  amount: number;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TravelRequest {
  id: string;
  employee_name: string;
  employee_email: string;
  department: string;
  destination: string;
  purpose: string;
  trip_start: string;
  trip_end: string;
  project_id: string;
  status: RequestStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  items: ExpenseItem[];
  project: Project | null;
}

export interface DailyRate {
  id: string;
  key: string;
  label: string;
  amount: number;
  unit: string;
  notes: string | null;
  updated_at: string;
}

// Form types (not persisted)
export interface ExpenseItemDraft {
  _id: string; // local only
  category: ExpenseCategory;
  date: string;
  description: string;
  km: string;
  amount: string;
  receipt_file?: File | null;
  receipt_url?: string | null;
}
