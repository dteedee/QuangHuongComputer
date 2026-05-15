import React from 'react';
import { ConfigFormProps, Input, Label, SelectField } from './section-config-form-helpers';

export const PostGridConfig: React.FC<ConfigFormProps> = ({ config, onChange }) => {
    const postType = (config.postType as string) ?? 'News';
    const limit = (config.limit as number) ?? 4;
    const columns = (config.columns as number) ?? 4;

    return (
        <div className="space-y-4">
            <SelectField
                label="Post Type"
                value={postType}
                options={['News', 'Article', 'Promotion']}
                onChange={v => onChange({ ...config, postType: v })}
            />
            <SelectField
                label="Columns"
                value={columns}
                options={[2, 3, 4]}
                onChange={v => onChange({ ...config, columns: Number(v) })}
            />
            <div>
                <Label>Post Limit</Label>
                <Input type="number" value={limit} min={1} max={12} onChange={e => onChange({ ...config, limit: Number(e.target.value) })} />
            </div>
        </div>
    );
};
