import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    automationRulesApi,
    type AutomationRule,
    type CreateAutomationRuleDto,
    TRIGGER_EVENTS,
    ACTION_TYPES,
} from '../../api/automation-rules';
import { ENTITY_TYPES } from '../../api/custom-fields';

const inputCls =
    'w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm ' +
    'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ' +
    'focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

interface RuleFormState {
    name: string;
    entityType: string;
    triggerEvent: string;
    triggerField: string;
    conditionJson: string;
    actionType: string;
    actionConfig: string;
    executionOrder: number;
}

const emptyForm = (): RuleFormState => ({
    name: '',
    entityType: 'Lead',
    triggerEvent: 'created',
    triggerField: '',
    conditionJson: '{}',
    actionType: 'send_notification',
    actionConfig: '{}',
    executionOrder: 0,
});

function fromRule(rule: AutomationRule): RuleFormState {
    return {
        name: rule.name,
        entityType: rule.entityType,
        triggerEvent: rule.triggerEvent,
        triggerField: rule.triggerField ?? '',
        conditionJson: rule.conditionJson,
        actionType: rule.actionType,
        actionConfig: rule.actionConfig,
        executionOrder: rule.executionOrder,
    };
}

function RuleForm({
    initial,
    onSave,
    onCancel,
    isEdit,
}: {
    initial: RuleFormState;
    onSave: (data: RuleFormState) => void;
    onCancel: () => void;
    isEdit: boolean;
}) {
    const [form, setForm] = useState<RuleFormState>(initial);
    const set = (patch: Partial<RuleFormState>) => setForm(f => ({ ...f, ...patch }));

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                    <label className={labelCls}>Rule Name *</label>
                    <input value={form.name} onChange={e => set({ name: e.target.value })} className={inputCls} placeholder="e.g. Notify manager when lead won" />
                </div>
                <div>
                    <label className={labelCls}>Entity Type *</label>
                    <select value={form.entityType} onChange={e => set({ entityType: e.target.value })} className={inputCls}>
                        {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Trigger Event *</label>
                    <select value={form.triggerEvent} onChange={e => set({ triggerEvent: e.target.value })} className={inputCls}>
                        {TRIGGER_EVENTS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                </div>
                {form.triggerEvent === 'field_changed' && (
                    <div>
                        <label className={labelCls}>Trigger Field</label>
                        <input value={form.triggerField} onChange={e => set({ triggerField: e.target.value })} className={inputCls} placeholder="e.g. status" />
                    </div>
                )}
                <div>
                    <label className={labelCls}>Action Type *</label>
                    <select value={form.actionType} onChange={e => set({ actionType: e.target.value })} className={inputCls}>
                        {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Execution Order</label>
                    <input type="number" value={form.executionOrder} onChange={e => set({ executionOrder: Number(e.target.value) })} className={inputCls} />
                </div>
            </div>

            <div>
                <label className={labelCls}>Condition JSON <span className="text-gray-400 font-normal">&#123; field, operator, value &#125;</span></label>
                <textarea
                    rows={3}
                    value={form.conditionJson}
                    onChange={e => set({ conditionJson: e.target.value })}
                    className={`${inputCls} font-mono text-xs`}
                    placeholder='{"field": "status", "operator": "equals", "value": "Won"}'
                />
            </div>

            <div>
                <label className={labelCls}>Action Config JSON</label>
                <textarea
                    rows={4}
                    value={form.actionConfig}
                    onChange={e => set({ actionConfig: e.target.value })}
                    className={`${inputCls} font-mono text-xs`}
                    placeholder='{"channel": "system", "recipientRoles": ["Manager"], "template": "Lead {name} updated"}'
                />
            </div>

            <div className="flex gap-2 justify-end pt-2">
                <button onClick={onCancel} className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                    Cancel
                </button>
                <button
                    onClick={() => onSave(form)}
                    className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                    {isEdit ? 'Update Rule' : 'Create Rule'}
                </button>
            </div>
        </div>
    );
}

export function AutomationRulesPage() {
    const qc = useQueryClient();
    const [editing, setEditing] = useState<{ rule?: AutomationRule } | null>(null);
    const [filterEntity, setFilterEntity] = useState('');

    const { data: rules = [], isLoading } = useQuery({
        queryKey: ['automation-rules', filterEntity],
        queryFn: () => automationRulesApi.list(filterEntity || undefined, false),
    });

    const createMut = useMutation({
        mutationFn: (dto: CreateAutomationRuleDto) => automationRulesApi.create(dto),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-rules'] }); toast.success('Rule created'); setEditing(null); },
        onError: () => toast.error('Failed to create rule'),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof automationRulesApi.update>[1] }) =>
            automationRulesApi.update(id, dto),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-rules'] }); toast.success('Rule updated'); setEditing(null); },
        onError: () => toast.error('Failed to update rule'),
    });

    const deleteMut = useMutation({
        mutationFn: automationRulesApi.remove,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-rules'] }); toast.success('Rule deleted'); },
        onError: () => toast.error('Failed to delete rule'),
    });

    const handleSave = (data: RuleFormState) => {
        const dto = {
            name: data.name,
            entityType: data.entityType,
            triggerEvent: data.triggerEvent as CreateAutomationRuleDto['triggerEvent'],
            actionType: data.actionType as CreateAutomationRuleDto['actionType'],
            triggerField: data.triggerField || undefined,
            conditionJson: data.conditionJson,
            actionConfig: data.actionConfig,
            executionOrder: data.executionOrder,
        };

        if (editing?.rule) {
            updateMut.mutate({ id: editing.rule.id, dto });
        } else {
            createMut.mutate(dto);
        }
    };

    const triggerLabel = (rule: AutomationRule) => {
        const ev = TRIGGER_EVENTS.find(e => e.value === rule.triggerEvent)?.label ?? rule.triggerEvent;
        return rule.triggerField ? `${ev}: ${rule.triggerField}` : ev;
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Automation Rules</h1>
                <div className="flex gap-2">
                    <select
                        value={filterEntity}
                        onChange={e => setFilterEntity(e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                        <option value="">All entities</option>
                        {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {!editing && (
                        <button
                            onClick={() => setEditing({})}
                            className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                        >
                            + New Rule
                        </button>
                    )}
                </div>
            </div>

            {editing && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        {editing.rule ? 'Edit Rule' : 'New Automation Rule'}
                    </h2>
                    <RuleForm
                        initial={editing.rule ? fromRule(editing.rule) : emptyForm()}
                        isEdit={!!editing.rule}
                        onSave={handleSave}
                        onCancel={() => setEditing(null)}
                    />
                </div>
            )}

            {isLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            <tr>
                                <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Name</th>
                                <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Entity</th>
                                <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Trigger</th>
                                <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Action</th>
                                <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Order</th>
                                <th className="text-left px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Status</th>
                                <th className="px-4 py-2" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {rules.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                                        No automation rules yet. Click "+ New Rule" to create one.
                                    </td>
                                </tr>
                            )}
                            {rules.map(rule => (
                                <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{rule.name}</td>
                                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{rule.entityType}</td>
                                    <td className="px-4 py-2 text-gray-600 dark:text-gray-300 text-xs">{triggerLabel(rule)}</td>
                                    <td className="px-4 py-2 text-gray-600 dark:text-gray-300 text-xs">
                                        {ACTION_TYPES.find(a => a.value === rule.actionType)?.label ?? rule.actionType}
                                    </td>
                                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-center">{rule.executionOrder}</td>
                                    <td className="px-4 py-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${rule.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
                                            {rule.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right whitespace-nowrap">
                                        <button onClick={() => setEditing({ rule })} className="text-indigo-600 dark:text-indigo-400 hover:underline mr-3 text-xs">Edit</button>
                                        <button onClick={() => deleteMut.mutate(rule.id)} className="text-red-500 hover:underline text-xs">Delete</button>
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
