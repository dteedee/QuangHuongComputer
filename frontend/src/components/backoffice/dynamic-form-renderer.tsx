import { type FieldSchemaItem, parseFieldsSchema } from '../../api/form-definitions';
import { type CustomFieldDefinition } from '../../api/custom-fields';
import { DynamicFieldRenderer } from './dynamic-field-renderer';

export interface DynamicFormRendererProps {
    /** Raw FieldsSchema JSON string from a FormDefinition */
    fieldsSchema: string;
    /** Custom field definitions for the entity (from Phase 5) */
    customFields?: CustomFieldDefinition[];
    /** Current field values keyed by fieldName */
    values: Record<string, unknown>;
    onChange: (key: string, value: unknown) => void;
    readOnly?: boolean;
}

const inputClass =
    'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm ' +
    'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ' +
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60';

function EntityFieldInput({
    fieldName,
    value,
    onChange,
    readOnly,
}: {
    fieldName: string;
    value: unknown;
    onChange: (val: unknown) => void;
    readOnly: boolean;
}) {
    return (
        <input
            type="text"
            id={fieldName}
            value={value == null ? '' : String(value)}
            disabled={readOnly}
            onChange={e => onChange(e.target.value)}
            className={inputClass}
        />
    );
}

function FieldWrapper({
    fieldName,
    width,
    children,
}: {
    fieldName: string;
    width: 'full' | 'half';
    children: React.ReactNode;
}) {
    return (
        <div className={width === 'half' ? 'w-full sm:w-1/2 px-1' : 'w-full px-1'}>
            <label
                htmlFor={fieldName}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
                {fieldName}
            </label>
            {children}
        </div>
    );
}

export function DynamicFormRenderer({
    fieldsSchema,
    customFields = [],
    values,
    onChange,
    readOnly = false,
}: DynamicFormRendererProps) {
    const items = parseFieldsSchema(fieldsSchema);

    if (!items.length) {
        return (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                No fields defined for this form.
            </p>
        );
    }

    // Collect consecutive fields into rows for half-width layout
    const rows: FieldSchemaItem[][] = [];
    let current: FieldSchemaItem[] = [];

    for (const item of items) {
        if (item.type === 'section') {
            if (current.length) { rows.push(current); current = []; }
            rows.push([item]);
        } else {
            current.push(item);
            if (item.width !== 'half' || current.length === 2) {
                rows.push(current);
                current = [];
            }
        }
    }
    if (current.length) rows.push(current);

    return (
        <div className="space-y-4">
            {rows.map((row, rowIdx) => {
                const first = row[0];

                if (first.type === 'section') {
                    return (
                        <h4
                            key={rowIdx}
                            className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700 pb-1 mt-4"
                        >
                            {first.title ?? 'Section'}
                        </h4>
                    );
                }

                return (
                    <div key={rowIdx} className="flex flex-wrap -mx-1">
                        {row.map((item, i) => {
                            if (item.type !== 'field' || !item.fieldName) return null;
                            const width = item.width ?? 'full';

                            if (item.source === 'custom') {
                                const def = customFields.find(f => f.fieldKey === item.fieldName);
                                if (!def) {
                                    return (
                                        <FieldWrapper key={i} fieldName={item.fieldName} width={width}>
                                            <span className="text-xs text-red-400">
                                                Custom field "{item.fieldName}" not found
                                            </span>
                                        </FieldWrapper>
                                    );
                                }
                                // Render single custom field via DynamicFieldRenderer
                                return (
                                    <div key={i} className={width === 'half' ? 'w-full sm:w-1/2 px-1' : 'w-full px-1'}>
                                        <DynamicFieldRenderer
                                            definitions={[def]}
                                            values={values}
                                            onChange={onChange}
                                            readOnly={readOnly}
                                        />
                                    </div>
                                );
                            }

                            // source === 'entity' — render plain text input
                            return (
                                <FieldWrapper key={i} fieldName={item.fieldName} width={width}>
                                    <EntityFieldInput
                                        fieldName={item.fieldName}
                                        value={values[item.fieldName]}
                                        onChange={val => onChange(item.fieldName!, val)}
                                        readOnly={readOnly}
                                    />
                                </FieldWrapper>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
