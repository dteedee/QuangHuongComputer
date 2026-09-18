/**
 * `form-inputs.tsx` — the ONE import path for every field in the form kit:
 *   import { TextField, MoneyField, SelectField } from '@/components/form/form-inputs';
 *
 * The phase spec names this one file for `TextField NumberField MoneyField
 * SelectField ComboboxField SwitchField DateField FileField RichTextField`;
 * the implementations live split across `form-text-fields.tsx` /
 * `form-choice-fields.tsx` / `form-date-file-fields.tsx` /
 * `form-richtext-field.tsx` to respect the 200-LOC guideline (development
 * rules) — this barrel is the public surface, those are implementation
 * detail. Import from here, not from the split files.
 */
export { TextField, NumberField, MoneyField, type TextFieldProps, type NumberFieldProps, type MoneyFieldProps } from './form-text-fields';
export {
  SelectField,
  ComboboxField,
  SwitchField,
  type SelectFieldProps,
  type ComboboxFieldProps,
  type SwitchFieldProps,
} from './form-choice-fields';
export { DateField, FileField, type DateFieldProps, type FileFieldProps } from './form-date-file-fields';
export { RichTextField, type RichTextFieldProps } from './form-richtext-field';
