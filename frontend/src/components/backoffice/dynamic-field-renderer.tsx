import { type CustomFieldDefinition, type FieldType } from '../../api/custom-fields';

export interface DynamicFieldRendererProps {
    definitions: CustomFieldDefinition[];
    values: Record<string, unknown>;
    onChange: (key: string, value: unknown) => void;
    readOnly?: boolean;
}

function parseOptions(optionsJson?: string | null): string[] {
    if (!optionsJson) return [];
    try {
        const parsed = JSON.parse(optionsJson);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function FieldInput({
    definition,
    value,
    onChange,
    readOnly,
}: {
    definition: CustomFieldDefinition;
    value: unknown;
    onChange: (val: unknown) => void;
    readOnly: boolean;
}) {
    const { fieldType, isRequired, fieldKey } = definition;
    const options = parseOptions(definition.optionsJson);
    const strVal = value == null ? '' : String(value);

    const inputClass =
        'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed';

    if (fieldType === 'boolean') {
        return (
            <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                    type="checkbox"
                    id={fieldKey}
                    checked={!!value}
                    disabled={readOnly}
                    onChange={e => onChange(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                    {value ? 'Yes' : 'No'}
                </span>
            </label>
        );
    }

    if (fieldType === 'select') {
        return (
            <select
                id={fieldKey}
                value={strVal}
                disabled={readOnly}
                required={isRequired}
                onChange={e => onChange(e.target.value)}
                className={inputClass}
            >
                <option value="">-- Select --</option>
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        );
    }

    if (fieldType === 'multiselect') {
        const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
        return (
            <div className="flex flex-wrap gap-2">
                {options.map(opt => {
                    const checked = selected.includes(opt);
                    return (
                        <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={checked}
                                disabled={readOnly}
                                onChange={() => {
                                    const next = checked
                                        ? selected.filter(s => s !== opt)
                                        : [...selected, opt];
                                    onChange(next);
                                }}
                                className="w-4 h-4 accent-indigo-600"
                            />
                            {opt}
                        </label>
                    );
                })}
            </div>
        );
    }

    const htmlType: Record<FieldType, string> = {
        text: 'text',
        number: 'number',
        boolean: 'checkbox',
        date: 'date',
        select: 'text',
        multiselect: 'text',
        url: 'url',
        email: 'email',
    };

    return (
        <input
            type={htmlType[fieldType] ?? 'text'}
            id={fieldKey}
            value={strVal}
            disabled={readOnly}
            required={isRequired}
            onChange={e => onChange(fieldType === 'number' ? Number(e.target.value) : e.target.value)}
            className={inputClass}
        />
    );
}

export function DynamicFieldRenderer({
    definitions,
    values,
    onChange,
    readOnly = false,
}: DynamicFieldRendererProps) {
    if (!definitions.length) return null;

    const sorted = [...definitions].sort((a, b) => a.displayOrder - b.displayOrder);

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700 pb-1">
                Custom Fields
            </h4>
            {sorted.map(def => (
                <div key={def.id} className="flex flex-col gap-1">
                    <label
                        htmlFor={def.fieldKey}
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        {def.label}
                        {def.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <FieldInput
                        definition={def}
                        value={values[def.fieldKey]}
                        onChange={val => onChange(def.fieldKey, val)}
                        readOnly={readOnly}
                    />
                </div>
            ))}
        </div>
    );
}
