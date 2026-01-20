import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface QueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDescending?: boolean;
  includeInactive?: boolean;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface UseCrudListOptions<T> {
  queryKey: string[];
  fetchFn: (params: QueryParams) => Promise<PagedResult<T>>;
  initialPageSize?: number;
}

export function useCrudList<T>({
  queryKey,
  fetchFn,
  initialPageSize = 20,
}: UseCrudListOptions<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>();
  const [sortDescending, setSortDescending] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  const queryParams: QueryParams = {
    page,
    pageSize,
    search: search || undefined,
    sortBy,
    sortDescending,
    includeInactive,
  };

  const query = useQuery({
    queryKey: [...queryKey, queryParams],
    queryFn: () => fetchFn(queryParams),
  });

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page on search
  }, []);

  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortDescending(!sortDescending);
    } else {
      setSortBy(field);
      setSortDescending(false);
    }
    setPage(1); // Reset to first page on sort
  }, [sortBy, sortDescending]);

  const handleToggleInactive = useCallback(() => {
    setIncludeInactive(!includeInactive);
    setPage(1);
  }, [includeInactive]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setSortBy(undefined);
    setSortDescending(false);
    setIncludeInactive(false);
    setPage(1);
  }, []);

  return {
    // Data
    data: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page,
    pageSize,
    totalPages: query.data?.totalPages ?? 0,

    // Query state
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // Filters
    search,
    sortBy,
    sortDescending,
    includeInactive,

    // Handlers
    handlePageChange,
    handleSearch,
    handleSort,
    handleToggleInactive,
    clearFilters,
  };
}
