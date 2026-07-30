import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, GripVertical, X, Save, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    customFieldsApi,
    ENTITY_TYPES,
    FIELD_TYPES,
    type CustomFieldDefinition,
    type CreateCustomFieldDto,
    type UpdateCustomFieldDto,
    type EntityType,
    type FieldType,
} from '../../api/custom-fields';

// ── helpers ──────────────────────────────────────────────────────────────────

const emptyForm = (): CreateCustomFieldDto => ({
    entityType: 'Product',
    fieldKey: '',
    label: '',
    fieldType: 'text',
    optionsJson: null,
    defaultValue: null,
    isRequired: false,
    isVisibleInList: false,
    isFilterable: false,
    isPublic: false,
    displayOrder: 0,
});

function needsOptions(ft: FieldType) {
    return ft === 'select' || ft === 'multiselect';
}

// ── sub-components ────────────────────────────────────────────────────────────

function FieldTypeLabel({ type }: { type: FieldType }) {
    const found = FIELD_TYPES.find(f => f.value === type);
    const colors: Record<FieldType, string> = {
        text: 'bg-gray-100 text-gray-700',
        number: 'bg-blue-100 text-blue-700',
        boolean: 'bg-purple-100 text-purple-700',
        date: 'bg-green-100 text-green-700',
        select: 'bg-yellow-100 text-yellow-700',
        multiselect: 'bg-orange-100 text-orange-700',
        url: 'bg-cyan-100 text-cyan-700',
        email: 'bg-pink-100 text-pink-700',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] ?? 'bg-gray-100 text-gray-700'}`}>
            {found?.label ?? type}
        </span>
    );
}

interface FieldFormProps {
    initial: Partial<CreateCustomFieldDto>;
    onSave: (dto: CreateCustomFieldDto) => void;
    onCancel: () => void;
    isSaving: boolean;
}

function FieldForm({ initial, onSave, onCancel, isSaving }: FieldFormProps) {
    const [form, setForm] = useState<CreateCustomFieldDto>({ ...emptyForm(), ...initial });
    const [optionsText, setOptionsText] = useState<string>(() => {
        if (!initial.optionsJson) return '';
        try { return JSON.parse(initial.optionsJson).join('\n'); } catch { return ''; }
    });

    const set = <K extends keyof CreateCustomFieldDto>(k: K, v: CreateCustomFieldDto[K]) =>
        setForm(prev => ({ ...prev, [k]: v }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dto: CreateCustomFieldDto = { ...form };
        if (needsOptions(form.fieldType) && optionsText.trim()) {
            const opts = optionsText.split('\n').map(s => s.trim()).filter(Boolean);
            dto.optionsJson = JSON.stringify(opts);
        } else {
            dto.optionsJson = null;
        }
        onSave(dto);
    };

    const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500';
    const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>Entity Type *</label>
                    <select value={form.entityType} onChange={e => set('entityType', e.target.value as EntityType)} className={inputCls} required>
                        {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Field Type *</label>
                    <select value={form.fieldType} onChange={e => set('fieldType', e.target.value as FieldType)} className={inputCls} required>
                        {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>Field Key * (snake_case)</label>
                    <input
                        className={inputCls}
                        value={form.fieldKey}
                        onChange={e => set('fieldKey', e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
                        placeholder="e.g. warranty_ext_months"
                        required
                        maxLength={100}
                    />
                </div>
                <div>
                    <label className={labelCls}>Label *</label>
                    <input
                        className={inputCls}
                        value={form.label}
                        onChange={e => set('label', e.target.value)}
                        placeholder="Display name"
                        required
                        maxLength={150}
                    />
                </div>
            </div>

            {needsOptions(form.fieldType) && (
                <div>
                    <label className={labelCls}>Options (one per line)</label>
                    <textarea
                        className={`${inputCls} h-24 resize-none`}
                        value={optionsText}
                        onChange={e => setOptionsText(e.target.value)}
                        placeholder={'Option A\nOption B\nOption C'}
                    />
                </div>
            )}

            <div>
                <label className={labelCls}>Default Value</label>
                <input
                    className={inputCls}
                    value={form.defaultValue ?? ''}
                    onChange={e => set('defaultValue', e.target.value || null)}
                    placeholder="Optional"
                    maxLength={500}
                />
            </div>

            <div>
                <label className={labelCls}>Display Order</label>
                <input
                    type="number"
                    className={inputCls}
                    value={form.displayOrder}
                    onChange={e => set('displayOrder', Number(e.target.value))}
                    min={0}
                />
            </div>

            <div className="flex flex-wrap gap-4">
                {(
                    [
                        { key: 'isRequired', label: 'Required' },
                        { key: 'isVisibleInList', label: 'Visible in list' },
                        { key: 'isFilterable', label: 'Filterable' },
                        { key: 'isPublic', label: 'Public' },
                    ] as { key: keyof CreateCustomFieldDto; label: string }[]
                ).map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={!!form[key]}
                            onChange={e => set(key, e.target.checked as CreateCustomFieldDto[typeof key])}
                            className="w-4 h-4 accent-indigo-600"
                        />
                        {label}
                    </label>
                ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={onCancel} className="px-4 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    Cancel
                </button>
                <button type="submit" disabled={isSaving} className="px-4 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
                    <Save size={14} />
                    {isSaving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </form>
    );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function CustomFieldsManager() {
    const [selectedEntity, setSelectedEntity] = useState<EntityType>('Product');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const qc = useQueryClient();
    const queryKey = ['custom-fields', selectedEntity];

    const { data: definitions = [], isLoading } = useQuery({
        queryKey,
        queryFn: () => customFieldsApi.list(selectedEntity, false),
    });

    const createMut = useMutation({
        mutationFn: customFieldsApi.create,
        onSuccess: () => { toast.success('Field created'); qc.invalidateQueries({ queryKey }); setShowForm(false); },
        onError: (e: { response?: { data?: { error?: string } } }) =>
            toast.error(e?.response?.data?.error ?? 'Failed to create field'),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateCustomFieldDto }) =>
            customFieldsApi.update(id, dto),
        onSuccess: () => { toast.success('Field updated'); qc.invalidateQueries({ queryKey }); setEditingId(null); },
        onError: (e: { response?: { data?: { error?: string } } }) =>
            toast.error(e?.response?.data?.error ?? 'Failed to update field'),
    });

    const deleteMut = useMutation({
        mutationFn: customFieldsApi.remove,
        onSuccess: () => { toast.success('Field deactivated'); qc.invalidateQueries({ queryKey }); },
        onError: () => toast.error('Failed to deactivate field'),
    });

    const toggleActive = (def: CustomFieldDefinition) =>
        updateMut.mutate({ id: def.id, dto: { isActive: !def.isActive } });

    const active = definitions.filter(d => d.isActive);
    const inactive = definitions.filter(d => !d.isActive);

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Custom Fields</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Define extra fields for each entity type. Values are stored as JSON on the entity.
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(true); setEditingId(null); }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                >
                    <Plus size={16} /> Add Field
                </button>
            </div>

            {/* Entity selector */}
            <div className="flex gap-2 flex-wrap">
                {ENTITY_TYPES.map(et => (
                    <button
                        key={et}
                        onClick={() => { setSelectedEntity(et); setShowForm(false); setEditingId(null); }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            selectedEntity === et
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        {et}
                    </button>
                ))}
            </div>

            {/* Add form */}
            {showForm && (
                <div className="border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 bg-indigo-50 dark:bg-indigo-900/20">
                    <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 mb-4">
                        New Field for {selectedEntity}
                    </h3>
                    <FieldForm
                        initial={{ entityType: selectedEntity }}
                        onSave={dto => createMut.mutate(dto)}
                        onCancel={() => setShowForm(false)}
                        isSaving={createMut.isPending}
                    />
                </div>
            )}

            {/* Field list */}
            {isLoading ? (
                <div className="text-center py-12 text-gray-400">Loading…</div>
            ) : definitions.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                    No custom fields defined for <strong>{selectedEntity}</strong>. Click "Add Field" to create one.
                </div>
            ) : (
                <div className="space-y-2">
                    {active.map(def => (
                        <FieldRow
                            key={def.id}
                            def={def}
                            isEditing={editingId === def.id}
                            onEdit={() => setEditingId(def.id)}
                            onCancelEdit={() => setEditingId(null)}
                            onSaveEdit={dto => updateMut.mutate({ id: def.id, dto })}
                            onToggle={() => toggleActive(def)}
                            onDelete={() => {
                                if (confirm(`Deactivate field "${def.label}"?`))
                                    deleteMut.mutate(def.id);
                            }}
                            isSaving={updateMut.isPending}
                        />
                    ))}

                    {inactive.length > 0 && (
                        <details className="mt-4">
                            <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1.5 select-none">
                                <ChevronDown size={14} />
                                {inactive.length} inactive field{inactive.length !== 1 ? 's' : ''}
                            </summary>
                            <div className="space-y-2 mt-2 opacity-60">
                                {inactive.map(def => (
                                    <FieldRow
                                        key={def.id}
                                        def={def}
                                        isEditing={false}
                                        onEdit={() => {}}
                                        onCancelEdit={() => {}}
                                        onSaveEdit={() => {}}
                                        onToggle={() => toggleActive(def)}
                                        onDelete={() => {}}
                                        isSaving={false}
                                        readOnly
                                    />
                                ))}
                            </div>
                        </details>
                    )}
                </div>
            )}
        </div>
    );
}

// ── FieldRow ──────────────────────────────────────────────────────────────────

interface FieldRowProps {
    def: CustomFieldDefinition;
    isEditing: boolean;
    onEdit: () => void;
    onCancelEdit: () => void;
    onSaveEdit: (dto: Partial<CreateCustomFieldDto>) => void;
    onToggle: () => void;
    onDelete: () => void;
    isSaving: boolean;
    readOnly?: boolean;
}

function FieldRow({ def, isEditing, onEdit, onCancelEdit, onSaveEdit, onToggle, onDelete, isSaving, readOnly }: FieldRowProps) {
    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
                <GripVertical size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{def.label}</span>
                        <FieldTypeLabel type={def.fieldType} />
                        {def.isRequired && <span className="text-xs text-red-500">required</span>}
                        {def.isPublic && <span className="text-xs text-green-600">public</span>}
                        {def.isFilterable && <span className="text-xs text-blue-500">filterable</span>}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{def.fieldKey}</p>
                </div>
                {!readOnly && (
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={onEdit}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                            title="Edit"
                        >
                            <Edit size={14} />
                        </button>
                        <button
                            onClick={onToggle}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs"
                            title={def.isActive ? 'Deactivate' : 'Reactivate'}
                        >
                            {def.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        {def.isActive && (
                            <button
                                onClick={onDelete}
                                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 dark:text-red-500"
                                title="Delete"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                )}
                {readOnly && (
                    <button
                        onClick={onToggle}
                        className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        Reactivate
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                    <FieldForm
                        initial={{
                            entityType: def.entityType,
                            fieldKey: def.fieldKey,
                            label: def.label,
                            fieldType: def.fieldType,
                            optionsJson: def.optionsJson,
                            defaultValue: def.defaultValue,
                            isRequired: def.isRequired,
                            isVisibleInList: def.isVisibleInList,
                            isFilterable: def.isFilterable,
                            isPublic: def.isPublic,
                            displayOrder: def.displayOrder,
                        }}
                        onSave={dto => onSaveEdit(dto)}
                        onCancel={onCancelEdit}
                        isSaving={isSaving}
                    />
                </div>
            )}
        </div>
    );
}
