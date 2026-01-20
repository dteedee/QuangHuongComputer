import { TextareaHTMLAttributes, forwardRef } from 'react';
import { inputVariants, labelVariants } from '../../design-system/variants';
import { cn } from '../../lib/utils';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = !!error;

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={textareaId} className={cn(labelVariants())}>
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            inputVariants({ state: hasError ? 'error' : 'default' }),
            'resize-none',
            className
          )}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${textareaId}-error` : undefined}
          {...props}
        />

        {error && (
          <p
            id={`${textareaId}-error`}
            className="text-danger-500 text-xs font-bold ml-1"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
