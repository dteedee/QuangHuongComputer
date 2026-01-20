import { useQuery } from '@tanstack/react-query';

export interface UseCrudDetailOptions<T> {
  queryKey: string[];
  fetchFn: (id: string) => Promise<T>;
  id: string;
  enabled?: boolean;
}

export function useCrudDetail<T>({
  queryKey,
  fetchFn,
  id,
  enabled = true,
}: UseCrudDetailOptions<T>) {
  const query = useQuery({
    queryKey: [...queryKey, id],
    queryFn: () => fetchFn(id),
    enabled: enabled && !!id,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
