import { DashboardSummary } from '../types';
import { api } from './client';

export async function fetchSummary() {
  const response = await api.get<DashboardSummary>('/dashboard/summary');
  return response.data;
}
