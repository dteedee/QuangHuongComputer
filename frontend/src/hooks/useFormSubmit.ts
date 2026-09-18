import { useState } from 'react';
import toast from 'react-hot-toast';

interface UseFormSubmitOptions<T> {
  onSubmit: (data: T) => Promise<void> | void;
  successMessage?: string;
  errorMessage?: string;
}

interface UseFormSubmitReturn<T> {
  isSubmitting: boolean;
  error: string | null;
  handleSubmit: (data: T) => Promise<void>;
}

/**
 * Generic "wrap an async submit with loading/error/toast state" hook for
 * plain imperative submit handlers (a button click, a non-RHF form). For a
 * form built on `react-hook-form` + zod, prefer `<Form>`
 * (`components/form/form.tsx`, W1-9) instead — it wires `isSubmitting` from
 * RHF's own `formState` and adds `applyServerErrors` field-level mapping,
 * which this hook (no RHF instance in scope) cannot do.
 */
export function useFormSubmit<T = unknown>({
  onSubmit,
  successMessage = 'Thao tác thành công!',
  errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại.',
}: UseFormSubmitOptions<T>): UseFormSubmitReturn<T> {
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
