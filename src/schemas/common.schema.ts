export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export const parsePagination = (query: PaginationQuery) => {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 10;

  return { page, limit, skip: (page - 1) * limit };
};
