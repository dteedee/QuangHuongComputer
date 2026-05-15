import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    formDefinitionsApi,
    type FormDefinition,
    type FieldSchemaItem,
    parseFieldsSchema,
} from '../../api/form-definitions';
import { ENTITY_TYPES } from '../../api/custom-fields';

const FIELD_WIDTHS: { value: 'full' | 'half'; label: string }[] = [
    { value: 'full', label: 'Full width' },
    { value: 'half', label: 'Half width' },
];

function FieldSchemaEditor({
    schema,
    onChange,
}: {
    schema: FieldSchemaItem[];
    onChange: (items: FieldSchemaItem[]) => void;
}) {
    const addSection = () => onChange([...schema, { type: 'section', title: 'New Section' }]);
    const addField = () =>
        onChange([...schema, { type: 'field', source: 'entity', fieldName: '', width: 'full' }]);
    const remove = (i: number) => onChange(schema.filter((_, idx) => idx !== i));
    const update = (i: number, patch: Partial<FieldSchemaItem>) =>
        onChange(schema.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
    const move = (i: number, dir: -1 | 1) => {
        const next = [...schema];
        const j = i + dir;
        if (j < 0 || j >= next.length) return;
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };

    const inputCls =
        'border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100';

    return (
        <div className="space-y-2">
            {schema.map((item, i) => (
                <div
                    key={i}
                    className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                >
                    <span className="text-xs font-mono text-gray-400 w-6">{i + 1}</span>
                    <select
                        value={item.type}
                        onChange={e => update(i, { type: e.target.value as 'section' | 'field' })}
                        className={inputCls}
                    >
                        <option value="section">Section</option>
                        <option value="field">Field</option>
                    </select>

                    {item.type === 'section' && (
                        <input
                            placeholder="Section title"
                            value={item.title ?? ''}
                            onChange={e => update(i, { title: e.target.value })}
                            className={`${inputCls} flex-1`}
                        />
                    )}

                    {item.type === 'field' && (
                        <>
                            <select
                                value={item.source ?? 'entity'}
                                onChange={e => update(i, { source: e.target.value as 'entity' | 'custom' })}
                                className={inputCls}
                            >
                                <option value="entity">Entity field</option>
                                <option value="custom">Custom field</option>
                            </select>
                            <input
                                placeholder="fieldName"
                                value={item.fieldName ?? ''}
                                onChange={e => update(i, { fieldName: e.target.value })}
                                className={`${inputCls} flex-1`}
                            />
                            <select
                                value={item.width ?? 'full'}
                                onChange={e => update(i, { width: e.target.value as 'full' | 'half' })}
                                className={inputCls}
                            >
                                {FIELD_WIDTHS.map(w => (
                                    <option key={w.value} value={w.value}>{w.label}</option>
                                ))}
                            </select>
                        </>
                    )}

                    <div className="flex gap-1 ml-auto">
                        <button onClick={() => move(i, -1)} className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500">↑</button>
                        <button onClick={() => move(i, 1)} className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500">↓</button>
                        <button onClick={() => remove(i)} className="px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800">✕</button>
                    </div>
                </div>
            ))}
            <div className="flex gap-2 mt-2">
                <button
                    type="button"
                    onClick={addSection}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                    + Section
                </button>
                <button
                    type="button"
                    onClick={addField}
                    className="px-3 py-1 text-sm border border-indigo-400 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900"
                >
                    + Field
                </button>
            </div>
        </div>
    );
}

function FormEditor({
    initial,
    onSave,
    onCancel,
}: {
    initial: Partial<FormDefinition>;
    onSave: (data: { code: string; name: string; description: string; entityType: string; fieldsSchema: string }) => void;
    onCancel: () => void;
}) {
    const [code, setCode] = useState(initial.code ?? '');
    const [name, setName] = useState(initial.name ?? '');
    const [description, setDescription] = useState(initial.description ?? '');
    const [entityType, setEntityType] = useState(initial.entityType ?? '');
    const [schema, setSchema] = useState<FieldSchemaItem[]>(
        parseFieldsSchema(initial.fieldsSchema ?? '[]')
    );

    const inputCls =
        'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500';
    const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>Code *</label>
                    <input value={code} onChange={e => setCode(e.target.value)} className={inputCls} placeholder="e.g. customer_intake" disabled={!!initial.id} />
                </div>
                <div>
                    <label className={labelCls}>Name *</label>
                    <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Form display name" />
                </div>
                <div>
                    <label className={labelCls}>Entity Type</label>
                    <select value={entityType} onChange={e => setEntityType(e.target.value)} className={inputCls}>
                        <option value="">-- Standalone --</option>
                        {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Description</label>
                    <input value={description} onChange={e => setDescription(e.target.value)} className={inputCls} placeholder="Optional description" />
                </div>
            </div>

            <div>
                <label className={labelCls}>Fields Schema</label>
                <FieldSchemaEditor schema={schema} onChange={setSchema} />
            </div>

            <div className="flex gap-2 justify-end pt-2">
                <button onClick={onCancel} className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                    Cancel
                </button>
                <button
                    onClick={() => onSave({ code, name, description, entityType, fieldsSchema: JSON.stringify(schema) })}
                    className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                    Save Form
                </button>
            </div>
        </div>
    );
}

export function FormBuilderPage() {
    const qc = useQueryClient();
    const [editing, setEditing] = useState<Partial<FormDefinition> | null>(null);

    const { data: forms = [], isLoading } = useQuery({
        queryKey: ['form-definitions'],
        queryFn: () => formDefinitionsApi.list(undefined, false),
    });

    const createMut = useMutation({
        mutationFn: formDefinitionsApi.create,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['form-definitions'] }); toast.success('Form created'); setEditing(null); },
        onError: () => toast.error('Failed to create form'),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof formDefinitionsApi.update>[1] }) =>
            formDefinitionsApi.update(id, dto),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['form-definitions'] }); toast.success('Form updated'); setEditing(null); },
        onError: () => toast.error('Failed to update form'),
    });

    const deleteMut = useMutation({
        mutationFn: formDefinitionsApi.remove,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['form-definitions'] }); toast.success('Form deleted'); },
        onError: () => toast.error('Failed to delete form'),
    });

    const handleSave = (data: { code: string; name: string; description: string; entityType: string; fieldsSchema: string }) => {
        if (editing?.id) {
            updateMut.mutate({ id: editing.id, dto: { name: data.name, description: data.description, entityType: data.entityType || undefined, fieldsSchema: data.fieldsSchema } });
        } else {
            createMut.mutate({ code: data.code, name: data.name, description: data.description, entityType: data.entityType || undefined, fieldsSchema: data.fieldsSchema });
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Form Builder</h1>
                {!editing && (
                    <button
                        onClick={() => setEditing({})}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                    >
                        + New Form
                    </button>
                )}
            </div>

            {editing && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        {editing.id ? 'Edit Form' : 'New Form'}
                    </h2>
                    <FormEditor initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
                </div>
            )}

            {isLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            <tr>
                                <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Code</th>
                                <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Name</th>
                                <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Entity</th>
                                <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Status</th>
                                <th className="px-4 py-2" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {forms.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                                        No forms defined yet. Click "+ New Form" to create one.
                                    </td>
                                </tr>
                            )}
                            {forms.map(form => (
                                <tr key={form.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                    <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">{form.code}</td>
                                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{form.name}</td>
                                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{form.entityType ?? '—'}</td>
                                    <td className="px-4 py-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${form.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
                                            {form.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <button onClick={() => setEditing(form)} className="text-indigo-600 dark:text-indigo-400 hover:underline mr-3 text-xs">Edit</button>
                                        <button onClick={() => deleteMut.mutate(form.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
