import axios from 'axios';
import type { Project, TravelRequest, DailyRate, WorkPackage, TravelPreRequest } from './types';

const BASE = import.meta.env.VITE_API_URL ?? '/api';
export const http = axios.create({ baseURL: BASE });

// Attach token from localStorage to every request
http.interceptors.request.use(cfg => {
  const token = localStorage.getItem('scch_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Projects
export const getProjects = (activeOnly = false) =>
  http.get<Project[]>('/projects', { params: { active_only: activeOnly } }).then(r => r.data);
export const createProject = (data: { code: string; name: string; funder: string; active: boolean }) =>
  http.post<Project>('/projects', data).then(r => r.data);
export const updateProject = (id: string, data: Partial<Project>) =>
  http.patch<Project>(`/projects/${id}`, data).then(r => r.data);
export const deleteProject = (id: string) => http.delete(`/projects/${id}`);

// Work Packages
export const getWorkPackages = (projectId?: string, activeOnly = false) =>
  http.get<WorkPackage[]>('/workpackages', { params: { project_id: projectId, active_only: activeOnly } }).then(r => r.data);
export const createWorkPackage = (data: { project_id: string; code: string; name: string; active: boolean }) =>
  http.post<WorkPackage>('/workpackages', data).then(r => r.data);
export const updateWorkPackage = (id: string, data: Partial<WorkPackage>) =>
  http.patch<WorkPackage>(`/workpackages/${id}`, data).then(r => r.data);
export const deleteWorkPackage = (id: string) => http.delete(`/workpackages/${id}`);

// Expense Requests
export const getRequests = (params?: { status?: string; project_id?: string; search?: string }) =>
  http.get<TravelRequest[]>('/requests', { params }).then(r => r.data);
export const getRequest = (id: string) =>
  http.get<TravelRequest>(`/requests/${id}`).then(r => r.data);
export const createRequest = (data: {
  first_name: string; last_name: string;
  employee_email?: string | null; department?: string | null;
  destination?: string | null; purpose: string;
  work_package?: string | null;
  trip_start: string; trip_end: string;
  departure_time?: string | null; return_time?: string | null;
  meal_breakfast: boolean; meal_lunch: boolean; meal_dinner: boolean;
  project_id: string;
}) => http.post<TravelRequest>('/requests', data).then(r => r.data);
export const submitRequest = (id: string) =>
  http.post<TravelRequest>(`/requests/${id}/submit`).then(r => r.data);
export const approveRequest = (id: string) =>
  http.post<TravelRequest>(`/requests/${id}/approve`).then(r => r.data);
export const rejectRequest = (id: string, reason: string) =>
  http.post<TravelRequest>(`/requests/${id}/reject`, { reason }).then(r => r.data);

// Last odometer reading for a person
export const getLastOdometer = (firstName: string, lastName: string) =>
  http.get<{ odometer_end: number | null }>('/requests/last-odometer', {
    params: { first_name: firstName, last_name: lastName },
  }).then(r => r.data);

// Route legs
export const saveRouteLegs = (
  requestId: string,
  legs: Array<{
    origin: string; destination: string; waypoints?: string[];
    distance_km?: number | null; duration_min?: number | null;
    return_trip: boolean; leg_order: number;
    odometer_end?: number | null;
  }>,
) => http.post(`/requests/${requestId}/route`, legs).then(r => r.data);

// Passengers
export const savePassengers = (
  requestId: string,
  passengers: Array<{ name: string; km: number }>,
) => http.post(`/requests/${requestId}/passengers`, passengers).then(r => r.data);

// Allowance days
export const saveAllowanceDays = (
  requestId: string,
  days: Array<{ day: string; is_abroad: boolean; meal_breakfast: boolean; meal_lunch: boolean; meal_dinner: boolean; allowance_amount: number }>,
) => http.post(`/requests/${requestId}/allowance-days`, days).then(r => r.data);

// Route calculation
export const calculateRoute = (origin: string, destination: string, waypoints?: string[]) =>
  http.post<{ distance_km?: number; duration_min?: number; error?: string }>(
    '/route/calculate', { origin, destination, waypoints: waypoints ?? [] },
  ).then(r => r.data);

// Items
export const addItem = (
  requestId: string,
  data: { category: string; date: string; description: string; km?: number | null; amount: number; receipt_url?: string | null; paid_privately?: boolean },
) => http.post(`/requests/${requestId}/items`, data).then(r => r.data);
export const deleteItem = (itemId: string) => http.delete(`/items/${itemId}`);
export const approveItem = (
  itemId: string,
  body: { kreditor: string; approved_amount?: number | null; approval_comment?: string | null; vat_rate?: number | null },
) => http.patch<import('./types').ExpenseItem>(`/items/${itemId}/approve`, body).then(r => r.data);
export const rejectItem  = (itemId: string) => http.patch<import('./types').ExpenseItem>(`/items/${itemId}/reject`).then(r => r.data);

// Rates
export const getRates = () => http.get<DailyRate[]>('/rates').then(r => r.data);
export const updateRate = (id: string, data: { amount?: number; label?: string; notes?: string }) =>
  http.patch<DailyRate>(`/rates/${id}`, data).then(r => r.data);

// Upload
export const uploadReceipt = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append('file', file);
  const res = await http.post<{ url: string }>('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data.url;
};

// VLM receipt amount extraction
export const extractReceiptAmount = async (file: File): Promise<number | null> => {
  const form = new FormData();
  form.append('file', file);
  try {
    const res = await http.post<{ amount: number | null; error?: string }>(
      '/extract-amount', form, { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data.amount ?? null;
  } catch {
    return null;
  }
};

// Travel Pre-Requests
export const getPreRequests = (params?: { status?: string }) =>
  http.get<TravelPreRequest[]>('/travel-requests', { params }).then(r => r.data);
export const createPreRequest = (data: {
  project_id: string;
  work_package?: string | null;
  destination: string;
  purpose: string;
  travel_start: string;
  travel_end: string;
  estimated_km?: number | null;
  estimated_nights?: number | null;
  estimated_other_costs?: number | null;
  notes?: string | null;
}) => http.post<TravelPreRequest>('/travel-requests', data).then(r => r.data);
export const approvePreRequest = (id: string) =>
  http.patch<TravelPreRequest>(`/travel-requests/${id}/approve`).then(r => r.data);
export const rejectPreRequest = (id: string, reason: string) =>
  http.patch<TravelPreRequest>(`/travel-requests/${id}/reject`, { reason }).then(r => r.data);
