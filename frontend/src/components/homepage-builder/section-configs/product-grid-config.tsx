import React from 'react';
import { type ConfigFormProps, Input, Label } from './section-config-form-helpers';

export const ProductGridConfig: React.FC<ConfigFormProps> = ({ config, onChange }) => {
    const icon = (config.icon as string) ?? '';
    const limit = (config.limit as number) ?? 5;
    const categorySlug = (config.categorySlug as string) ?? '';

    return (
        <div className="space-y-4">
            <div>
                <Label>Section Icon (Lucide name)</Label>
                <Input value={icon} onChange={e => onChange({ ...config, icon: e.target.value })} placeholder="e.g. Laptop, Monitor, Cpu" />
            </div>
            <div>
                <Label>Category Slug (leave empty for all)</Label>
                <Input value={categorySlug} onChange={e => onChange({ ...config, categorySlug: e.target.value })} placeholder="e.g. laptop, gaming-pc" />
            </div>
            <div>
                <Label>Product Limit</Label>
                <Input type="number" value={limit} min={1} max={20} onChange={e => onChange({ ...config, limit: Number(e.target.value) })} />
            </div>
        </div>
    );
};
