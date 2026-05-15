import React from 'react';
import { ConfigFormProps, Input, Label, Toggle, ItemList } from './section-config-form-helpers';

interface Slide {
    title?: string; subtitle?: string; description?: string;
    image?: string; gradient?: string; link?: string; badge?: string;
}

const SLIDE_FIELDS: (keyof Slide)[] = ['title', 'subtitle', 'description', 'image', 'link', 'badge', 'gradient'];

export const HeroSliderConfig: React.FC<ConfigFormProps> = ({ config, onChange }) => {
    const slides: Slide[] = (config.slides as Slide[]) ?? [];
    const showSidebar = (config.showSidebar as boolean) ?? true;

    const updateSlide = (idx: number, field: keyof Slide, value: string) => {
        onChange({ ...config, slides: slides.map((s, i) => i === idx ? { ...s, [field]: value } : s) });
    };

    return (
        <div className="space-y-4">
            <Toggle
                checked={showSidebar}
                onChange={v => onChange({ ...config, showSidebar: v })}
                label="Show Sidebar"
            />
            <ItemList
                label="Slides"
                items={slides}
                onAdd={() => onChange({ ...config, slides: [...slides, { title: '', subtitle: '', image: '', link: '/', badge: '' }] })}
                onRemove={idx => onChange({ ...config, slides: slides.filter((_, i) => i !== idx) })}
                renderItem={(slide, idx) => (
                    <>
                        {SLIDE_FIELDS.map(field => (
                            <div key={field}>
                                <Label>{field}</Label>
                                <Input
                                    value={(slide[field] as string) ?? ''}
                                    onChange={e => updateSlide(idx, field, e.target.value)}
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
