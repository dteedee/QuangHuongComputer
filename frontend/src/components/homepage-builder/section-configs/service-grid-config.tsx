import React from 'react';
import { type ConfigFormProps, Input, Label, SelectField, ItemList } from './section-config-form-helpers';

interface ServiceItem { icon?: string; title?: string; desc?: string; }

const SERVICE_FIELDS: (keyof ServiceItem)[] = ['icon', 'title', 'desc'];

export const ServiceGridConfig: React.FC<ConfigFormProps> = ({ config, onChange }) => {
    const services: ServiceItem[] = (config.services as ServiceItem[]) ?? [];
    const columns = (config.columns as number) ?? 4;

    const updateService = (idx: number, field: keyof ServiceItem, value: string) => {
        onChange({ ...config, services: services.map((s, i) => i === idx ? { ...s, [field]: value } : s) });
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
                label="Service Items"
                items={services}
                onAdd={() => onChange({ ...config, services: [...services, { icon: 'Star', title: '', desc: '' }] })}
                onRemove={idx => onChange({ ...config, services: services.filter((_, i) => i !== idx) })}
                renderItem={(service, idx) => (
                    <>
                        {SERVICE_FIELDS.map(field => (
                            <div key={field}>
                                <Label>{field}</Label>
                                <Input
                                    value={(service[field] as string) ?? ''}
                                    onChange={e => updateService(idx, field, e.target.value)}
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
