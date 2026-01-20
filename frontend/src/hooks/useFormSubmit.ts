import { useState } from 'react';
import toast from 'react-hot-toast';

interface UseFormSubmitOptions<T> {
  onSubmit: (data: T) => Promise<void> | void;
  successMessage?: string;
  errorMessage?: string;
}

interface UseFormSubmitReturn {
  isSubmitting: boolean;
  error: string | null;
  handleSubmit: (data: any) => Promise<void>;
}

/**
 * Custom hook for handling form submission with loading and error states
 */
export function useFormSubmit<T = any>({
  onSubmit,
  successMessage = 'Thao tác thành công!',
  errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại.',
}: UseFormSubmitOptions<T>): UseFormSubmitReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: T) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(data);
      toast.success(successMessage);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : errorMessage;
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    error,
    handleSubmit,
  };
}
