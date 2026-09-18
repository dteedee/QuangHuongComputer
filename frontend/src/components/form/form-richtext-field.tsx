/**
 * `RichTextField` — WYSIWYG HTML editor (`react-quill`, already a dependency
 * and already used by `pages/backoffice/CMSPortal.tsx`; no new library).
 *
 * Security (phase file "Security Considerations"): this component's job is
 * AUTHORING html, not rendering it. Sanitisation happens twice, on purpose:
 *  1. here, on blur — DOMPurify (`kit-utils.sanitizeHtml`, the UI kit's one
 *     allow-list) strips anything dangerous before it ever reaches form
 *     state or a save call, so a malicious paste cannot even be submitted;
 *  2. wherever this HTML is later DISPLAYED (a product page, a CMS block),
 *     the consuming page MUST render it through `<SafeHtml html={...} />`
 *     (`components/ui/safe-html.tsx`) — never `dangerouslySetInnerHTML`
 *     directly. This field cannot enforce that at the far end; it only
 *     controls what enters the pipeline.
 */
import { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { sanitizeHtml } from '../ui/kit-utils';
import { FormField, type FormFieldProps } from './form-field';

type SharedFieldChrome = Pick<FormFieldProps, 'label' | 'hint' | 'required' | 'className'>;

const DEFAULT_MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean'],
  ],
};

export interface RichTextFieldProps<T extends FieldValues> extends SharedFieldChrome {
  name: FieldPath<T>;
  control: Control<T>;
  placeholder?: string;
  disabled?: boolean;
  /** Override the toolbar — defaults to a safe, product-description-sized set. */
  modules?: Record<string, unknown>;
}

export function RichTextField<T extends FieldValues>({
  name,
  control,
  label,
  hint,
  required,
  className,
  placeholder,
  disabled,
  modules = DEFAULT_MODULES,
}: RichTextFieldProps<T>) {
  const { field, fieldState } = useController({ name, control });
  // Quill's own instance is uncontrolled internally; re-creating the modules
  // object on every render would remount the toolbar, so memoise it once.
  const resolvedModules = useMemo(() => modules, [modules]);

  return (
    <FormField label={label} hint={hint} required={required} className={className} error={fieldState.error?.message}>
      {(a11y) => (
        <div id={a11y.id} aria-invalid={a11y['aria-invalid']} aria-describedby={a11y['aria-describedby']}>
          <ReactQuill
            theme="snow"
            readOnly={disabled}
            placeholder={placeholder}
            modules={resolvedModules}
            value={(field.value as string | undefined) ?? ''}
            onChange={(html) => field.onChange(html)}
            onBlur={() => field.onChange(sanitizeHtml((field.value as string | undefined) ?? ''))}
          />
        </div>
      )}
    </FormField>
  );
}
