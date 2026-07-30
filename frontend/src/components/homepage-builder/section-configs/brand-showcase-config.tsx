import React from 'react';
import { type ConfigFormProps, Input, Label, Toggle, SelectField, ItemList } from './section-config-form-helpers';

interface Brand { name: string; logoUrl: string; link: string; }

export const BrandShowcaseConfig: React.FC<ConfigFormProps> = ({ config, onChange }) => {
    const brands: Brand[] = (config.brands as Brand[]) ?? [];
    const columns = (config.columns as number) ?? 6;
    const style = (config.style as string) ?? 'grid';
    const showTitle = (config.showTitle as boolean) ?? true;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <SelectField
                    label="Display Style"
                    value={style}
                    options={['grid', 'carousel']}
                    onChange={v => onChange({ ...config, style: v })}
                />
                <div>
                    <Label>Columns (grid)</Label>
                    <Input type="number" value={columns} min={3} max={8} onChange={e => onChange({ ...config, columns: Number(e.target.value) })} />
                </div>
            </div>

            <Toggle checked={showTitle} onChange={v => onChange({ ...config, showTitle: v })} label="Show Section Title" />

            <ItemList
                label="Brands"
                items={brands}
                onAdd={() => onChange({ ...config, brands: [...brands, { name: '', logoUrl: '', link: '' }] })}
                onRemove={idx => onChange({ ...config, brands: brands.filter((_, i) => i !== idx) })}
                renderItem={(brand, idx) => (
                    <div className="space-y-2">
                        <div>
                            <Label>Brand Name</Label>
                            <Input
                                value={brand.name}
                                onChange={e => onChange({ ...config, brands: brands.map((b, i) => i === idx ? { ...b, name: e.target.value } : b) })}
                                placeholder="ASUS"
                            />
                        </div>
                        <div>
                            <Label>Logo URL</Label>
                            <Input
                                value={brand.logoUrl}
                                onChange={e => onChange({ ...config, brands: brands.map((b, i) => i === idx ? { ...b, logoUrl: e.target.value } : b) })}
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <Label>Link</Label>
                            <Input
                                value={brand.link}
                                onChange={e => onChange({ ...config, brands: brands.map((b, i) => i === idx ? { ...b, link: e.target.value } : b) })}
                                placeholder="/products?brand=asus"
                            />
                        </div>
                    </div>
                )}
            />
        </div>
    );
};
