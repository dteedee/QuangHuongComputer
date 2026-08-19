import { useQuery } from '@tanstack/react-query';
import { customFieldsApi, type EntityType, type CustomFieldDefinition } from '../../api/custom-fields';
import { Sparkles } from 'lucide-react';

interface ProductAttributesEditorProps {
    entityType: EntityType;
    value: Record<string, unknown>;
    onChange: (next: Record<string, unknown>) => void;
}

/**
 * Renders one input per active CustomFieldDefinition for the given entity type, backed by the
 * JSON `attributes` blob on Product/Order/Lead. This is the admin-facing counterpart of
 * CustomFieldsManager.tsx — that page DEFINES fields, this component fills their VALUES.
 */
export default function ProductAttributesEditor({ entityType, value, onChange }: ProductAttributesEditorProps) {
    const { data: definitions = [] } = useQuery({
        queryKey: ['custom-fields', entityType, 'active'],
        queryFn: () => customFieldsApi.list(entityType, true),
    });

    if (definitions.length === 0) return null;

    const set = (key: string, v: unknown) => onChange({ ...value, [key]: v });

    const renderInput = (def: CustomFieldDefinition) => {
        const current = value[def.fieldKey];
        const inputCls = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-accent/10';

        switch (def.fieldType) {
            case 'boolean':
                return (
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={Boolean(current)}
                            onChange={e => set(def.fieldKey, e.target.checked)}
                            className="w-4 h-4 accent-accent"
                        />
                        {current ? 'Có' : 'Không'}
                    </label>
                );
            case 'number':
                return (
                    <input
                        type="number"
                        className={inputCls}
                        value={typeof current === 'number' ? current : ''}
                        onChange={e => set(def.fieldKey, e.target.value === '' ? null : Number(e.target.value))}
                    />
                );
            case 'date':
                return (
                    <input
                        type="date"
                        className={inputCls}
                        value={typeof current === 'string' ? current.slice(0, 10) : ''}
                        onChange={e => set(def.fieldKey, e.target.value)}
                    />
                );
            case 'select': {
                let options: string[] = [];
                try { options = def.optionsJson ? JSON.parse(def.optionsJson) : []; } catch { /* ignore */ }
                return (
                    <select className={inputCls} value={typeof current === 'string' ? current : ''} onChange={e => set(def.fieldKey, e.target.value)}>
                        <option value="">— Chọn —</option>
                        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                );
            }
            default:
                return (
                    <input
                        type="text"
                        className={inputCls}
                        value={typeof current === 'string' ? current : ''}
                        placeholder={def.defaultValue ?? ''}
                        onChange={e => set(def.fieldKey, e.target.value)}
                    />
                );
        }
    };

    return (
        <div className="space-y-4 p-6 rounded-3xl bg-indigo-50/40 border border-indigo-100">
            <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-500" />
                <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Trường tuỳ chỉnh ({entityType})</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {definitions.map(def => (
                    <div key={def.fieldKey} className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600">
                            {def.label} {def.isRequired && <span className="text-red-500">*</span>}
                        </label>
                        {renderInput(def)}
                    </div>
                ))}
            </div>
        </div>
    );
}
