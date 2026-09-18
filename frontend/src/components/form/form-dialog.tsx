/**
 * `<CrudFormDialog>` — the required pattern for every wave-3 CRUD screen
 * (phase spec, implementation step 4): Dialog chrome + one RHF form + a
 * submit/cancel footer that survives the dialog's own scroll area + a dirty
 * guard on every close path (X, Escape, backdrop, Cancel) + server-error
 * mapping + focus of the first invalid field.
 *
 * It does not reuse `<Form>` (`form.tsx`) directly: `Dialog`'s `footer` and
 * `children` are two separate props of the SAME parent call (the footer
 * stays fixed while only the body scrolls — Dialog's own contract), so the
 * submit/cancel buttons need the RHF instance in scope a level above where
 * `<Form>`'s render-prop would give it to them. Both this component and
 * `<Form>` share the identical resolver/mode setup through `useAppForm`
 * (`form.tsx`), so they never drift apart.
 */
import { useEffect, useId, type ReactNode } from 'react';
import { FormProvider, type DefaultValues, type FieldPath, type FieldValues, type UseFormReturn } from 'react-hook-form';
import type { ZodType } from 'zod';
import { Dialog, type DialogSize } from '../ui/dialog';
import { Button } from '../ui/Button';
import { useAppForm, type FormMode } from './form';
import { applyServerErrors } from './apply-server-errors';
import { useUnsavedChangesGuard } from './use-unsaved-changes-guard';

export interface CrudFormDialogProps<T extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  schema: ZodType<T, any, any>;
  /** Re-applied via `form.reset()` every time the dialog transitions to open — safe to reuse one dialog instance for both "create" (omit/empty) and "edit" (the row being edited). */
  defaultValues?: DefaultValues<T>;
  onSubmit: (data: T, form: UseFormReturn<T>) => Promise<void>;
  children: ReactNode | ((form: UseFormReturn<T>) => ReactNode);
  size?: DialogSize;
  submitLabel?: string;
  cancelLabel?: string;
  mode?: FormMode;
  /** Field names the server can legitimately report errors for — passed straight to `applyServerErrors`. */
  knownFields?: ReadonlyArray<FieldPath<T>>;
}

export function CrudFormDialog<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  defaultValues,
  onSubmit,
  children,
  size = 'md',
  submitLabel = 'Lưu',
  cancelLabel = 'Huỷ',
  mode,
  knownFields,
}: CrudFormDialogProps<T>) {
  const reactId = useId();
  const formId = `crud-form-${reactId}`;
  const form = useAppForm<T>({ schema, defaultValues, mode });
  const { guardedClose } = useUnsavedChangesGuard({ isDirty: form.formState.isDirty });

  // A dialog is usually kept mounted across opens (create vs edit reuse the
  // same instance) — `useForm({defaultValues})` only reads that value on
  // mount, so re-seed on every open or the second edit shows the first row.
  useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const closeUnlessDirty = () => void guardedClose(() => onOpenChange(false));

  const handleOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    closeUnlessDirty();
  };

  const submit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data, form);
    } catch (err) {
      const applied = applyServerErrors(form.setError, err, knownFields);
      if (applied[0]) form.setFocus(applied[0]);
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      size={size}
      footer={
        <>
          <Button variant="ghost" onClick={closeUnlessDirty} disabled={form.formState.isSubmitting}>
            {cancelLabel}
          </Button>
          <Button type="submit" form={formId} loading={form.formState.isSubmitting}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id={formId} onSubmit={submit} noValidate>
          {typeof children === 'function' ? children(form) : children}
        </form>
      </FormProvider>
    </Dialog>
  );
}

export default CrudFormDialog;
