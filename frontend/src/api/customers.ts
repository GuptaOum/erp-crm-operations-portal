import { Customer, CustomerDetail, CustomerNote, FollowUpQueue, Paginated } from '../types';
import { api } from './client';

export interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
}

export interface CustomerPayload {
  name: string;
  mobile: string;
  email?: string;
  businessName: string;
  gstNumber?: string;
  type: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  status: string;
  followUpDate?: string;
  notes?: string;
}

export async function fetchCustomers(filters: CustomerFilters) {
  const response = await api.get<Paginated<Customer>>('/customers', { params: filters });
  return response.data;
}

export async function fetchFollowUps(params: { bucket?: string; page?: number; limit?: number }) {
  const response = await api.get<FollowUpQueue>('/customers/follow-ups', { params });
  return response.data;
}

export async function fetchCustomer(id: string) {
  const response = await api.get<CustomerDetail>(`/customers/${id}`);
  return response.data;
}

export async function createCustomer(payload: CustomerPayload) {
  const response = await api.post<Customer>('/customers', payload);
  return response.data;
}

export async function updateCustomer(id: string, payload: Partial<CustomerPayload>) {
  const response = await api.patch<Customer>(`/customers/${id}`, payload);
  return response.data;
}

export async function addFollowUpNote(id: string, note: string, followUpDate?: string) {
  const response = await api.post<CustomerNote>(`/customers/${id}/notes`, { note, followUpDate });
  return response.data;
}
