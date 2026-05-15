import React from 'react';
import { ConfigFormProps, Input, Label, SelectField, ItemList } from './section-config-form-helpers';

interface Banner { title?: string; subtitle?: string; icon?: string; gradient?: string; link?: string; }

const BANNER_FIELDS: (keyof Banner)[] = ['title', 'subtitle', 'icon', 'gradient', 'link'];

export const BannerGridConfig: React.FC<ConfigFormProps> = ({ config, onChange }) => {
    const banners: Banner[] = (config.banners as Banner[]) ?? [];
    const columns = (config.columns as number) ?? 3;

    const updateBanner = (idx: number, field: keyof Banner, value: string) => {
        onChange({ ...config, banners: banners.map((b, i) => i === idx ? { ...b, [field]: value } : b) });
    };

    return (
        <div className="space-y-4">
            <SelectField
                label="Columns"
                value={columns}
                options={[2, 3, 4]}
                onChange={v => onChange({ ...config, columns: Number(v) })}
            />
            <ItemList
                label="Banners"
                items={banners}
                onAdd={() => onChange({ ...config, banners: [...banners, { title: '', subtitle: '', icon: 'Star', link: '/' }] })}
                onRemove={idx => onChange({ ...config, banners: banners.filter((_, i) => i !== idx) })}
                renderItem={(banner, idx) => (
                    <>
                        {BANNER_FIELDS.map(field => (
                            <div key={field}>
                                <Label>{field}</Label>
                                <Input
                                    value={(banner[field] as string) ?? ''}
                                    onChange={e => updateBanner(idx, field, e.target.value)}
                                    placeholder={field}
                                />
                            </div>
                        ))}
                    </>
                )}
            />
        </div>
    );
};
