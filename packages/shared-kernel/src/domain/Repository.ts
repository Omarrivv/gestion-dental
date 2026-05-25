/**
 * IRepository — generic port (interface) that all repository adapters implement.
 * Lives in the domain layer — no infrastructure details leak here.
 */
export interface IRepository<T, TId = string> {
  findById(id: TId): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: TId): Promise<void>;
}

/**
 * IPaginatedRepository — adds cursor / offset pagination.
 */
export interface IPaginatedRepository<T, TId = string> extends IRepository<T, TId> {
  findMany(options: PaginationOptions): Promise<PaginatedResult<T>>;
}

export interface PaginationOptions {
  organizationId: string;
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}
