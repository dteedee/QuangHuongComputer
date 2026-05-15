import React from 'react';
import { ConfigFormProps, Label } from './section-config-form-helpers';

export const CustomHtmlConfig: React.FC<ConfigFormProps> = ({ config, onChange }) => {
    const html = (config.html as string) ?? '';

    return (
        <div className="space-y-2">
            <Label>HTML Content</Label>
            <textarea
                value={html}
                onChange={e => onChange({ ...config, html: e.target.value })}
                rows={8}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="<div>Your HTML here...</div>"
            />
            <p className="text-xs text-gray-400">HTML is sanitized before rendering on the public site.</p>
        </div>
    );
};
