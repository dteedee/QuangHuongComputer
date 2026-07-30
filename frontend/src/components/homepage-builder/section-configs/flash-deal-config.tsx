import React from 'react';
import { type ConfigFormProps, Input, Label, Toggle } from './section-config-form-helpers';

export const FlashDealConfig: React.FC<ConfigFormProps> = ({ config, onChange }) => {
    const tag = (config.tag as string) ?? 'sale';
    const limit = (config.limit as number) ?? 5;
    const showViewAll = (config.showViewAll as boolean) ?? true;

    return (
        <div className="space-y-4">
            <div>
                <Label>Product Tag Filter</Label>
                <Input value={tag} onChange={e => onChange({ ...config, tag: e.target.value })} placeholder="e.g. sale, flash" />
            </div>
            <div>
                <Label>Product Limit</Label>
                <Input type="number" value={limit} min={1} max={20} onChange={e => onChange({ ...config, limit: Number(e.target.value) })} />
            </div>
            <Toggle checked={showViewAll} onChange={v => onChange({ ...config, showViewAll: v })} label="Show 'View All' button" />
        </div>
    );
};
