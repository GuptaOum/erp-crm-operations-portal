import { Challan, Paginated } from '../types';
import { api } from './client';

export interface ChallanFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerId?: string;
}

export interface ChallanPayload {
  customerId: string;
  notes?: string;
  confirm: boolean;
  items: { productId: string; quantity: number }[];
}

export async function fetchChallans(filters: ChallanFilters) {
  const response = await api.get<Paginated<Challan>>('/challans', { params: filters });
  return response.data;
}

export async function fetchChallan(id: string) {
  const response = await api.get<Challan>(`/challans/${id}`);
  return response.data;
}

export async function createChallan(payload: ChallanPayload) {
  const response = await api.post<Challan>('/challans', payload);
  return response.data;
}

export async function confirmChallan(id: string) {
  const response = await api.post<Challan>(`/challans/${id}/confirm`);
  return response.data;
}

export async function cancelChallan(id: string) {
  const response = await api.post<Challan>(`/challans/${id}/cancel`);
  return response.data;
}

export async function downloadChallanPdf(id: string, challanNumber: string) {
  const response = await api.get(`/challans/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `${challanNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
