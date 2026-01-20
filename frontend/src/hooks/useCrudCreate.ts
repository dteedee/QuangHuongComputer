import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export interface UseCrudCreateOptions<TCreate> {
  mutationKey: string[];
  createFn: (data: TCreate) => Promise<any>;
  onSuccess?: (data: any) => void;
  invalidateKeys?: string[][];
  successMessage?: string;
}

export function useCrudCreate<TCreate>({
  mutationKey,
  createFn,
  onSuccess,
  invalidateKeys = [],
  successMessage = 'Created successfully',
}: UseCrudCreateOptions<TCreate>) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey,
    mutationFn: createFn,
    onSuccess: (data) => {
      toast.success(successMessage);
      invalidateKeys.forEach((keys) => {
        queryClient.invalidateQueries({ queryKey: keys });
      });
      onSuccess?.(data);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || error.message || 'Failed to create';
      toast.error(message);
    },
  });

  return {
    create: mutation.mutate,
    createAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
}
