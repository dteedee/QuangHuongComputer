/**
 * `<Form>` — RHF provider + zod resolver + submit wiring, one form state for
 * the whole page (this is the structural fix for the product-editor
 * data-loss bug: conditional DOM + `FormData` meant an unmounted tab
 * contributed nothing; one RHF form across all tabs means every tab's values
 * live in the same `form.getValues()` regardless of which tab is visible —
 * see `form.test.tsx` for the regression test).
 *
 * Two ways to use it:
 *   <Form schema={productSchema} defaultValues={p} onSubmit={save}>
 *     <TextField name="name" control={...} />           // via useFormContext
 *   </Form>
 *
 *   <Form schema={productSchema} defaultValues={p} onSubmit={save}>
 *     {(form) => <TextField name="name" control={form.control} />}
 *   </Form>
 *
 * `CrudFormDialog` (`form-dialog.tsx`) does not reuse this component directly
 * — a dialog's footer buttons live OUTSIDE the scrollable body (Dialog's own
 * contract) and need the same `form` instance, so it calls `useAppForm`
 * itself and renders the `<form>` element by hand. Both paths share this one
 * hook so the resolver/mode wiring never drifts.
 */
import { type ReactNode } from 'react';
import {
  FormProvider,
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
  type SubmitHandler,
  type UseFormProps,
  type UseFormReturn,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';

export type FormMode = NonNullable<UseFormProps['mode']>;

export interface UseAppFormOptions<T extends FieldValues> {
  schema: ZodType<T, any, any>;
  defaultValues?: DefaultValues<T>;
  /** RHF validation trigger. `onBlur` by default — validates without nagging on every keystroke. */
  mode?: FormMode;
}

/** Shared `useForm` + zod wiring — used by both `<Form>` and `CrudFormDialog`. */
export function useAppForm<T extends FieldValues>({
  schema,
  defaultValues,
  mode = 'onBlur',
}: UseAppFormOptions<T>): UseFormReturn<T> {
  return useForm<T>({
    resolver: zodResolver(schema) as unknown as Resolver<T>,
    defaultValues,
    mode,
  });
}

export interface FormProps<T extends FieldValues> extends UseAppFormOptions<T> {
  onSubmit: (data: T, form: UseFormReturn<T>) => Promise<void> | void;
  children: ReactNode | ((form: UseFormReturn<T>) => ReactNode);
  id?: string;
  className?: string;
}

export function Form<T extends FieldValues>({
  schema,
  defaultValues,
  mode,
  onSubmit,
  children,
  id,
  className,
}: FormProps<T>) {
  const form = useAppForm<T>({ schema, defaultValues, mode });

  const submit: SubmitHandler<T> = async (data) => {
    await onSubmit(data, form);
  };

  return (
    <FormProvider {...form}>
      <form id={id} className={className} onSubmit={form.handleSubmit(submit)} noValidate>
        {typeof children === 'function' ? children(form) : children}
      </form>
    </FormProvider>
  );
}

export default Form;
