import { Paginated, StockMovement } from '../types';
import { api } from './client';

export interface StockMovementFilters {
  page?: number;
  limit?: number;
  productId?: string;
  type?: string;
}

export async function fetchStockMovements(filters: StockMovementFilters) {
  const response = await api.get<Paginated<StockMovement>>('/stock-movements', {
    params: filters,
  });

  return response.data;
}
