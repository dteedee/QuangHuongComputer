import React from 'react';
import { type ConfigFormProps, Input, Label, Toggle, ItemList } from './section-config-form-helpers';

interface BrandTab { name: string; brandId: string; }
interface SidePanel { imageUrl: string; link: string; }

export const ProductGridWithPanelsConfig: React.FC<ConfigFormProps> = ({ config, onChange }) => {
    const icon = (config.icon as string) ?? '';
    const limit = (config.limit as number) ?? 10;
    const columns = (config.columns as number) ?? 4;
    const categorySlug = (config.categorySlug as string) ?? '';
    const showViewAll = (config.showViewAll as boolean) ?? true;
    const brandTabs: BrandTab[] = (config.brandTabs as BrandTab[]) ?? [];
    const leftPanel: SidePanel = (config.leftPanel as SidePanel) ?? { imageUrl: '', link: '' };
    const rightPanel: SidePanel = (config.rightPanel as SidePanel) ?? { imageUrl: '', link: '' };
    const backgroundColor = (config.backgroundColor as string) ?? '';

    const updatePanel = (side: 'leftPanel' | 'rightPanel', field: keyof SidePanel, value: string) => {
        const current = side === 'leftPanel' ? leftPanel : rightPanel;
        onChange({ ...config, [side]: { ...current, [field]: value } });
    };

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label>Icon (Lucide name)</Label>
                    <Input value={icon} onChange={e => onChange({ ...config, icon: e.target.value })} placeholder="e.g. Laptop, Monitor" />
                </div>
                <div>
                    <Label>Category Slug</Label>
                    <Input value={categorySlug} onChange={e => onChange({ ...config, categorySlug: e.target.value })} placeholder="e.g. laptop" />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div>
                    <Label>Product Limit</Label>
                    <Input type="number" value={limit} min={1} max={30} onChange={e => onChange({ ...config, limit: Number(e.target.value) })} />
                </div>
                <div>
                    <Label>Columns (2-5)</Label>
                    <Input type="number" value={columns} min={2} max={5} onChange={e => onChange({ ...config, columns: Number(e.target.value) })} />
                </div>
                <div>
                    <Label>Background Color</Label>
                    <Input value={backgroundColor} onChange={e => onChange({ ...config, backgroundColor: e.target.value })} placeholder="#f2f2f2" />
                </div>
            </div>

            <Toggle checked={showViewAll} onChange={v => onChange({ ...config, showViewAll: v })} label="Show View All link" />

            {/* Side Panels */}
            <div className="border-t pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Left Banner Panel</p>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label>Image URL</Label>
                        <Input value={leftPanel.imageUrl} onChange={e => updatePanel('leftPanel', 'imageUrl', e.target.value)} placeholder="https://..." />
                    </div>
                    <div>
                        <Label>Link</Label>
                        <Input value={leftPanel.link} onChange={e => updatePanel('leftPanel', 'link', e.target.value)} placeholder="/products" />
                    </div>
                </div>
            </div>

            <div className="border-t pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Right Banner Panel</p>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label>Image URL</Label>
                        <Input value={rightPanel.imageUrl} onChange={e => updatePanel('rightPanel', 'imageUrl', e.target.value)} placeholder="https://..." />
                    </div>
                    <div>
                        <Label>Link</Label>
                        <Input value={rightPanel.link} onChange={e => updatePanel('rightPanel', 'link', e.target.value)} placeholder="/products" />
                    </div>
                </div>
            </div>

            {/* Brand Tabs */}
            <div className="border-t pt-4">
                <ItemList
                    label="Brand Tabs"
                    items={brandTabs}
                    onAdd={() => onChange({ ...config, brandTabs: [...brandTabs, { name: '', brandId: '' }] })}
                    onRemove={idx => onChange({ ...config, brandTabs: brandTabs.filter((_, i) => i !== idx) })}
                    renderItem={(tab, idx) => (
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label>Brand Name</Label>
                                <Input
                                    value={tab.name}
                                    onChange={e => onChange({ ...config, brandTabs: brandTabs.map((t, i) => i === idx ? { ...t, name: e.target.value } : t) })}
                                    placeholder="ASUS"
                                />
                            </div>
                            <div>
                                <Label>Brand ID</Label>
                                <Input
                                    value={tab.brandId}
                                    onChange={e => onChange({ ...config, brandTabs: brandTabs.map((t, i) => i === idx ? { ...t, brandId: e.target.value } : t) })}
                                    placeholder="brand-uuid"
                                />
                            </div>
                        </div>
                    )}
                />
            </div>
        </div>
    );
};
