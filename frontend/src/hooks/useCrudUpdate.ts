import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export interface UseCrudUpdateOptions<TUpdate> {
  mutationKey: string[];
  updateFn: (id: string, data: TUpdate) => Promise<any>;
  onSuccess?: (data: any) => void;
  invalidateKeys?: string[][];
  successMessage?: string;
}

export function useCrudUpdate<TUpdate>({
  mutationKey,
  updateFn,
  onSuccess,
  invalidateKeys = [],
  successMessage = 'Updated successfully',
}: UseCrudUpdateOptions<TUpdate>) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey,
    mutationFn: ({ id, data }: { id: string; data: TUpdate }) => updateFn(id, data),
    onSuccess: (data) => {
      toast.success(successMessage);
      invalidateKeys.forEach((keys) => {
        queryClient.invalidateQueries({ queryKey: keys });
      });
      onSuccess?.(data);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || error.message || 'Failed to update';
      toast.error(message);
    },
  });

  return {
    update: mutation.mutate,
    updateAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
}
