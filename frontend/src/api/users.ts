import { Paginated, PortalUser } from '../types';
import { api } from './client';

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  role: string;
  password: string;
}

export interface UpdateUserPayload {
  name?: string;
  role?: string;
  isActive?: boolean;
}

export async function fetchUsers(filters: UserFilters) {
  const response = await api.get<Paginated<PortalUser>>('/users', { params: filters });
  return response.data;
}

export async function createUser(payload: CreateUserPayload) {
  const response = await api.post<PortalUser>('/users', payload);
  return response.data;
}

export async function updateUser(id: string, payload: UpdateUserPayload) {
  const response = await api.patch<PortalUser>(`/users/${id}`, payload);
  return response.data;
}

export async function resetUserPassword(id: string, password: string) {
  const response = await api.post<PortalUser>(`/users/${id}/password`, { password });
  return response.data;
}
