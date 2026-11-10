import { z } from "zod";

// Simple offset pagination shared by every list endpoint (features.md Phase 5:
// "every list endpoint paginates"). page is 1-indexed; pageSize is capped to
// keep a single request from forcing a huge table scan.
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function paginate<T>(data: T[], total: number, { page, pageSize }: PaginationQuery): Paginated<T> {
  return {
    data,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function toSkipTake({ page, pageSize }: PaginationQuery): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
