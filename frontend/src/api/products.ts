import { Paginated, Product } from '../types';
import { api } from './client';

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  lowStock?: string;
}

export interface ProductPayload {
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock?: number;
  minStockAlert: number;
  location: string;
  isActive: boolean;
}

export async function fetchProducts(filters: ProductFilters) {
  const response = await api.get<Paginated<Product>>('/products', { params: filters });
  return response.data;
}

export async function fetchCategories() {
  const response = await api.get<{ data: string[] }>('/products/categories');
  return response.data.data;
}

export async function fetchProduct(id: string) {
  const response = await api.get<Product>(`/products/${id}`);
  return response.data;
}

export async function createProduct(payload: ProductPayload) {
  const response = await api.post<Product>('/products', payload);
  return response.data;
}

export async function updateProduct(id: string, payload: Partial<ProductPayload>) {
  const response = await api.patch<Product>(`/products/${id}`, payload);
  return response.data;
}

export async function adjustStock(id: string, quantity: number, type: string, reason: string) {
  const response = await api.post<Product>(`/products/${id}/stock`, { quantity, type, reason });
  return response.data;
}

export async function uploadProductImage(id: string, file: File) {
  const form = new FormData();
  form.append('image', file);

  const response = await api.post<Product>(`/products/${id}/image`, form);
  return response.data;
}
