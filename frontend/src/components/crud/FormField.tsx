import { type ReactNode, Children, isValidElement } from 'react';
import { SearchableSelect, type SearchableSelectOption } from '../ui/SearchableSelect';

export interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  children?: ReactNode;
  as?: 'input' | 'textarea' | 'select';
  rows?: number;
  className?: string;
}

// Extract options from <option> children for backward compatibility
function extractOptionsFromChildren(children: ReactNode): SearchableSelectOption[] {
  const options: SearchableSelectOption[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === 'option') {
      const props = child.props as { value?: string; children?: ReactNode };
      options.push({
        value: String(props.value ?? ''),
        label: String(props.children ?? ''),
      });
    }
  });
  return options;
}

export function FormField({
  label,
  name,
  type = 'text',
  required = false,
  error,
  placeholder,
  children,
  as = 'input',
  rows = 4,
  className = '',
}: FormFieldProps) {
  const baseClassName = `mt-1 block w-full border ${
    error ? 'border-red-300' : 'border-gray-300'
  } rounded-md shadow-sm py-2 px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`;

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {as === 'input' && (
        <input
          type={type}
          name={name}
          id={name}
          required={required}
          placeholder={placeholder}
          className={baseClassName}
        />
      )}
      {as === 'textarea' && (
        <textarea
          name={name}
          id={name}
          required={required}
          placeholder={placeholder}
          rows={rows}
          className={baseClassName}
        />
      )}
      {as === 'select' && (
        <div className="mt-1">
          <SearchableSelect
            name={name}
            id={name}
            options={extractOptionsFromChildren(children)}
            placeholder={placeholder || 'Chọn...'}
            error={!!error}
            className={className}
          />
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
