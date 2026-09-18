/**
 * ============================================================================
 * THE FORM KIT — one import path for RHF + zod forms.
 *   import { Form, TextField, MoneyField, CrudFormDialog } from '@/components/form';
 *
 * Contract: docs/frontend-form-kit.md (READ IT before building a form page).
 * Owner: W1-9. Every wave-3 CRUD screen uses `CrudFormDialog` + a schema from
 * `schemas/<domain>.ts` — no bespoke forms (phase spec, Integration requests).
 * ==========================================================================*/

export { Form, useAppForm, type FormProps, type FormMode, type UseAppFormOptions } from './form';
export { FormField, type FormFieldProps, type FormFieldA11yProps } from './form-field';
export { CrudFormDialog, type CrudFormDialogProps } from './form-dialog';
export { applyServerErrors } from './apply-server-errors';
export { useUnsavedChangesGuard, type UnsavedChangesGuardOptions } from './use-unsaved-changes-guard';

export {
  TextField,
  NumberField,
  MoneyField,
  SelectField,
  ComboboxField,
  SwitchField,
  DateField,
  FileField,
  RichTextField,
  type TextFieldProps,
  type NumberFieldProps,
  type MoneyFieldProps,
  type SelectFieldProps,
  type ComboboxFieldProps,
  type SwitchFieldProps,
  type DateFieldProps,
  type FileFieldProps,
  type RichTextFieldProps,
} from './form-inputs';
