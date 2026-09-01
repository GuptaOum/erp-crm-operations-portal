export interface PageParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function getPageParams(page: number, limit: number): PageParams {
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(total: number, page: number, limit: number): PageMeta {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  };
}
