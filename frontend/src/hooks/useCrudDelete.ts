import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export interface UseCrudDeleteOptions {
  mutationKey: string[];
  deleteFn: (id: string) => Promise<void>;
  onSuccess?: () => void;
  invalidateKeys?: string[][];
  successMessage?: string;
  confirmMessage?: string;
}

export function useCrudDelete({
  mutationKey,
  deleteFn,
  onSuccess,
  invalidateKeys = [],
  successMessage = 'Deleted successfully',
  confirmMessage = 'Are you sure you want to delete this item?',
}: UseCrudDeleteOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey,
    mutationFn: deleteFn,
    onSuccess: () => {
      toast.success(successMessage);
      invalidateKeys.forEach((keys) => {
        queryClient.invalidateQueries({ queryKey: keys });
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || error.message || 'Failed to delete';
      toast.error(message);
    },
  });

  const deleteWithConfirm = (id: string) => {
    if (window.confirm(confirmMessage)) {
      mutation.mutate(id);
    }
  };

  return {
    delete: mutation.mutate,
    deleteWithConfirm,
    deleteAsync: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
}
