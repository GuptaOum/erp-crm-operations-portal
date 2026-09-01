import axios from 'axios';

const TOKEN_KEY = 'operations_portal_token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.params) {
    config.params = Object.fromEntries(
      Object.entries(config.params).filter(
        ([, value]) => value !== '' && value !== null && value !== undefined,
      ),
    );
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearToken();

      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  },
);

interface ApiErrorBody {
  error?: {
    message?: string;
    details?: { field: string; message: string }[];
  };
}

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    const details = body?.error?.details;

    if (details && details.length > 0) {
      return details.map((detail) => detail.message).join('. ');
    }

    return body?.error?.message ?? 'The server could not be reached';
  }

  return 'Something went wrong';
}
