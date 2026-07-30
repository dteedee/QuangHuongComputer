import React from 'react';
import { type ConfigFormProps, Input, Label, SelectField } from './section-config-form-helpers';

export const CategoryGridConfig: React.FC<ConfigFormProps> = ({ config, onChange }) => {
    const limit = (config.limit as number) ?? 8;
    const columns = (config.columns as number) ?? 4;

    return (
        <div className="space-y-4">
            <SelectField
                label="Columns"
                value={columns}
                options={[2, 3, 4, 6]}
                onChange={v => onChange({ ...config, columns: Number(v) })}
            />
            <div>
                <Label>Max Categories</Label>
                <Input type="number" value={limit} min={1} max={24} onChange={e => onChange({ ...config, limit: Number(e.target.value) })} />
            </div>
        </div>
    );
};
