/**
 * Shared UI primitives for section config form components.
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export interface ConfigFormProps {
    config: Record<string, unknown>;
    onChange: (config: Record<string, unknown>) => void;
}

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{children}</label>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
    />
);

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
    <label className="flex items-center gap-3 cursor-pointer select-none">
        <div
            onClick={() => onChange(!checked)}
            className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${checked ? 'bg-blue-500' : 'bg-gray-300'}`}
        >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
        </div>
        <span className="text-sm text-gray-700">{label}</span>
    </label>
);

export const SelectField: React.FC<{
    label: string;
    value: number | string;
    options: (number | string)[];
    onChange: (v: string) => void;
}> = ({ label, value, options, onChange }) => (
    <div>
        <Label>{label}</Label>
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none"
        >
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    </div>
);

interface ItemListProps<T> {
    label: string;
    items: T[];
    onAdd: () => void;
    onRemove: (idx: number) => void;
    renderItem: (item: T, idx: number) => React.ReactNode;
}

export function ItemList<T>({ label, items, onAdd, onRemove, renderItem }: ItemListProps<T>) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label>{label} ({items.length})</Label>
                <button onClick={onAdd} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <Plus size={12} /> Add
                </button>
            </div>
            {items.map((item, idx) => (
                <div key={idx} className="border border-gray-100 rounded-xl p-4 space-y-2 bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-500 uppercase">Item {idx + 1}</span>
                        <button onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={14} />
                        </button>
                    </div>
                    {renderItem(item, idx)}
                </div>
            ))}
        </div>
    );
}
