import axios from 'axios';
import type { Project, TravelRequest, DailyRate } from './types';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

const http = axios.create({ baseURL: BASE });

// Projects
export const getProjects = (activeOnly = false) =>
  http.get<Project[]>('/projects', { params: { active_only: activeOnly } }).then(r => r.data);

export const createProject = (data: { code: string; name: string; funder: string; active: boolean }) =>
  http.post<Project>('/projects', data).then(r => r.data);

export const updateProject = (id: string, data: Partial<Project>) =>
  http.patch<Project>(`/projects/${id}`, data).then(r => r.data);

export const deleteProject = (id: string) => http.delete(`/projects/${id}`);

// Requests
export const getRequests = (params?: { status?: string; project_id?: string; search?: string }) =>
  http.get<TravelRequest[]>('/requests', { params }).then(r => r.data);

export const getRequest = (id: string) =>
  http.get<TravelRequest>(`/requests/${id}`).then(r => r.data);

export const createRequest = (data: {
  employee_name: string;
  employee_email: string;
  department: string;
  destination: string;
  purpose: string;
  work_package?: string | null;
  trip_start: string;
  trip_end: string;
  departure_time?: string | null;
  return_time?: string | null;
  project_id: string;
}) => http.post<TravelRequest>('/requests', data).then(r => r.data);

export const submitRequest = (id: string) =>
  http.post<TravelRequest>(`/requests/${id}/submit`).then(r => r.data);

export const approveRequest = (id: string) =>
  http.post<TravelRequest>(`/requests/${id}/approve`).then(r => r.data);

export const rejectRequest = (id: string, reason: string) =>
  http.post<TravelRequest>(`/requests/${id}/reject`, { reason }).then(r => r.data);

// Route legs
export const saveRouteLegs = (
  requestId: string,
  legs: Array<{
    origin: string;
    destination: string;
    distance_km?: number | null;
    duration_min?: number | null;
    return_trip: boolean;
    leg_order: number;
  }>,
) => http.post(`/requests/${requestId}/route`, legs).then(r => r.data);

// Route calculation
export const calculateRoute = (origin: string, destination: string) =>
  http.post<{ distance_km?: number; duration_min?: number; error?: string }>(
    '/route/calculate',
    { origin, destination },
  ).then(r => r.data);

// Items
export const addItem = (
  requestId: string,
  data: {
    category: string;
    date: string;
    description: string;
    km?: number | null;
    amount: number;
    receipt_url?: string | null;
  },
) => http.post(`/requests/${requestId}/items`, data).then(r => r.data);

export const deleteItem = (itemId: string) => http.delete(`/items/${itemId}`);

// Rates
export const getRates = () => http.get<DailyRate[]>('/rates').then(r => r.data);

export const updateRate = (id: string, data: { amount?: number; label?: string; notes?: string }) =>
  http.patch<DailyRate>(`/rates/${id}`, data).then(r => r.data);

// Upload
export const uploadReceipt = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append('file', file);
  const res = await http.post<{ url: string }>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.url;
};
