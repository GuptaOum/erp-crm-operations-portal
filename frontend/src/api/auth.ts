import { AuthUser } from '../types';
import { api } from './client';

export async function login(email: string, password: string) {
  const response = await api.post<{ token: string; user: AuthUser }>('/auth/login', {
    email,
    password,
  });

  return response.data;
}

export async function fetchProfile() {
  const response = await api.get<AuthUser>('/auth/me');
  return response.data;
}
