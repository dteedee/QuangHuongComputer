import React, { useState } from 'react';
import { type ConfigFormProps, Label } from './section-config-form-helpers';

/** Fallback: raw JSON editor for section types without a dedicated form. */
export const GenericConfig: React.FC<ConfigFormProps> = ({ config, onChange }) => {
    const [raw, setRaw] = useState(() => JSON.stringify(config, null, 2));
    const [error, setError] = useState('');

    const handleChange = (value: string) => {
        setRaw(value);
        try {
            onChange(JSON.parse(value));
            setError('');
        } catch {
            setError('Invalid JSON');
        }
    };

    return (
        <div className="space-y-2">
            <Label>Configuration (JSON)</Label>
            <textarea
                value={raw}
                onChange={e => handleChange(e.target.value)}
                rows={10}
                className={`w-full border rounded-lg px-3 py-2 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 ${error ? 'border-red-400' : 'border-gray-200'}`}
                spellCheck={false}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
};
