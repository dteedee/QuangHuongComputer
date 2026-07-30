/**
 * Live preview thumbnails for each homepage section type.
 * Shows a simplified visual representation of the section config.
 */
import React from 'react';
import { Image, Grid3X3, Zap, ShoppingBag, Tag, Star, FileText, Code } from 'lucide-react';

interface SectionPreviewProps {
    sectionType: string;
    config: Record<string, unknown>;
    title: string;
}

// ─── Hero Slider Preview ──────────────────────────────────────────────────────

const HeroSliderPreview: React.FC<{ config: Record<string, unknown> }> = ({ config }) => {
    const slides = (config.slides as Array<{ title?: string; image?: string; badge?: string }>) ?? [];
    const first = slides[0];

    return (
        <div className="relative rounded-lg overflow-hidden bg-gradient-to-r from-red-600 to-amber-500 h-28 flex items-center px-4">
            {first?.image && (
                <img src={first.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
            )}
            <div className="relative z-10">
                {first?.badge && (
                    <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mb-1 inline-block">
                        {first.badge}
                    </span>
                )}
                <p className="text-white font-bold text-sm leading-tight">{first?.title || 'Hero Slider'}</p>
                <p className="text-white/70 text-xs mt-0.5">{slides.length} slide{slides.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="absolute right-3 bottom-3 flex gap-1">
                {slides.map((_, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/40'}`} />
                ))}
            </div>
        </div>
    );
};

// ─── Banner Grid Preview ──────────────────────────────────────────────────────

const BannerGridPreview: React.FC<{ config: Record<string, unknown> }> = ({ config }) => {
    const banners = (config.banners as Array<{ title?: string; gradient?: string }>) ?? [];
    const columns = (config.columns as number) ?? 3;

    return (
        <div className={`grid gap-2 h-20`} style={{ gridTemplateColumns: `repeat(${Math.min(columns, banners.length || columns)}, 1fr)` }}>
            {(banners.length > 0 ? banners : Array.from({ length: columns })).slice(0, columns).map((b, i) => {
                const banner = banners[i];
                return (
                    <div
                        key={i}
                        className={`rounded-lg flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br ${banner?.gradient || 'from-blue-500 to-cyan-600'}`}
                    >
                        {banner?.title || '—'}
                    </div>
                );
            })}
        </div>
    );
};

// ─── Flash Deal Preview ───────────────────────────────────────────────────────

const FlashDealPreview: React.FC<{ config: Record<string, unknown> }> = ({ config }) => {
    const limit = (config.limit as number) ?? 5;
    return (
        <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-lg p-3 h-20 flex items-center gap-3">
            <Zap className="text-yellow-300 shrink-0" size={24} />
            <div>
                <p className="text-white font-bold text-sm">Flash Sale</p>
                <p className="text-white/80 text-xs">Showing {limit} products · Tag: {String(config.tag || 'sale')}</p>
            </div>
        </div>
    );
};

// ─── Product Grid Preview ─────────────────────────────────────────────────────

const ProductGridPreview: React.FC<{ config: Record<string, unknown> }> = ({ config }) => {
    const limit = (config.limit as number) ?? 5;
    return (
        <div className="bg-gray-50 rounded-lg p-3 h-20">
            <div className="flex items-center gap-2 mb-2">
                <ShoppingBag size={14} className="text-blue-500" />
                <span className="text-xs font-bold text-gray-700 uppercase">Products</span>
                {config.categorySlug ? <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded">{String(config.categorySlug)}</span> : null}
            </div>
            <div className="flex gap-1.5">
                {Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
                    <div key={i} className="flex-1 bg-white border border-gray-200 rounded h-8" />
                ))}
            </div>
        </div>
    );
};

// ─── Category Grid Preview ────────────────────────────────────────────────────

const CategoryGridPreview: React.FC<{ config: Record<string, unknown> }> = ({ config }) => {
    const columns = (config.columns as number) ?? 4;
    const limit = (config.limit as number) ?? 8;
    return (
        <div className="bg-gray-50 rounded-lg p-3 h-20">
            <div className="flex items-center gap-2 mb-2">
                <Grid3X3 size={14} className="text-purple-500" />
                <span className="text-xs font-bold text-gray-700 uppercase">Categories</span>
                <span className="text-[10px] text-gray-400">{limit} items / {columns} cols</span>
            </div>
            <div className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {Array.from({ length: Math.min(columns * 2, 8) }).map((_, i) => (
                    <div key={i} className="bg-purple-100 rounded h-4" />
                ))}
            </div>
        </div>
    );
};

// ─── Service Grid Preview ─────────────────────────────────────────────────────

const ServiceGridPreview: React.FC<{ config: Record<string, unknown> }> = ({ config }) => {
    const services = (config.services as Array<{ title?: string; icon?: string }>) ?? [];
    const columns = (config.columns as number) ?? 4;
    return (
        <div className="bg-gray-50 rounded-lg p-3 h-20">
            <div className="flex items-center gap-2 mb-2">
                <Star size={14} className="text-amber-500" />
                <span className="text-xs font-bold text-gray-700 uppercase">Services</span>
                <span className="text-[10px] text-gray-400">{services.length} items</span>
            </div>
            <div className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${Math.min(columns, 4)}, 1fr)` }}>
                {Array.from({ length: Math.min(services.length || columns, 4) }).map((_, i) => (
                    <div key={i} className="bg-amber-100 rounded h-6 flex items-center justify-center">
                        <span className="text-[9px] text-amber-700 font-medium truncate px-1">{services[i]?.title || '—'}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Post Grid Preview ────────────────────────────────────────────────────────

const PostGridPreview: React.FC<{ config: Record<string, unknown> }> = ({ config }) => {
    const postType = (config.postType as string) ?? 'News';
    const limit = (config.limit as number) ?? 4;
    return (
        <div className="bg-gray-50 rounded-lg p-3 h-20">
            <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className="text-green-500" />
                <span className="text-xs font-bold text-gray-700 uppercase">{postType}</span>
                <span className="text-[10px] text-gray-400">{limit} posts</span>
            </div>
            <div className="space-y-1">
                {Array.from({ length: Math.min(limit, 3) }).map((_, i) => (
                    <div key={i} className="h-3 bg-green-100 rounded w-full" />
                ))}
            </div>
        </div>
    );
};

// ─── Custom HTML Preview ──────────────────────────────────────────────────────

const CustomHtmlPreview: React.FC<{ config: Record<string, unknown> }> = ({ config }) => {
    const html = config.html as string;
    return (
        <div className="bg-gray-800 rounded-lg p-3 h-20 flex items-center gap-3">
            <Code size={20} className="text-green-400 shrink-0" />
            <pre className="text-green-300 text-[10px] font-mono overflow-hidden line-clamp-3 flex-1">
                {html ? html.slice(0, 100) : '<div>Custom HTML content</div>'}
            </pre>
        </div>
    );
};

// ─── Generic Preview ──────────────────────────────────────────────────────────

const GenericPreview: React.FC<{ sectionType: string; config: Record<string, unknown> }> = ({ sectionType, config }) => {
    const keys = Object.keys(config);
    return (
        <div className="bg-gray-50 rounded-lg p-3 h-20 flex items-center gap-3">
            <Image size={20} className="text-gray-400 shrink-0" />
            <div>
                <p className="text-xs font-bold text-gray-600 uppercase">{sectionType.replace(/_/g, ' ')}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{keys.length} config field{keys.length !== 1 ? 's' : ''}: {keys.slice(0, 3).join(', ')}{keys.length > 3 ? '...' : ''}</p>
            </div>
        </div>
    );
};

// ─── Tag ──────────────────────────────────────────────────────────────────────

// ─── Product Grid With Panels Preview ────────────────────────────────────────

const ProductGridWithPanelsPreview: React.FC<{ config: Record<string, unknown> }> = ({ config }) => {
    const limit = (config.limit as number) ?? 10;
    const leftPanel = config.leftPanel as { imageUrl?: string } | undefined;
    const rightPanel = config.rightPanel as { imageUrl?: string } | undefined;
    const brandTabs = (config.brandTabs as Array<{ name?: string }>) ?? [];

    return (
        <div className="bg-gray-50 rounded-lg p-3 h-20">
            <div className="flex items-center gap-2 mb-2">
                <ShoppingBag size={14} className="text-red-500" />
                <span className="text-xs font-bold text-gray-700 uppercase">Grid + Panels</span>
                {brandTabs.length > 0 && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded">{brandTabs.length} brands</span>}
            </div>
            <div className="flex gap-1 h-8">
                {leftPanel?.imageUrl && <div className="w-5 bg-blue-200 rounded shrink-0" title="Left panel" />}
                <div className="flex-1 flex gap-1">
                    {Array.from({ length: Math.min(limit, 4) }).map((_, i) => (
                        <div key={i} className="flex-1 bg-white border border-gray-200 rounded" />
                    ))}
                </div>
                {rightPanel?.imageUrl && <div className="w-5 bg-blue-200 rounded shrink-0" title="Right panel" />}
            </div>
        </div>
    );
};

// ─── Brand Showcase Preview ──────────────────────────────────────────────────

const BrandShowcasePreview: React.FC<{ config: Record<string, unknown> }> = ({ config }) => {
    const brands = (config.brands as Array<{ name?: string; logoUrl?: string }>) ?? [];
    const columns = (config.columns as number) ?? 6;

    return (
        <div className="bg-gray-50 rounded-lg p-3 h-20">
            <div className="flex items-center gap-2 mb-2">
                <Tag size={14} className="text-teal-500" />
                <span className="text-xs font-bold text-gray-700 uppercase">Brands</span>
                <span className="text-[10px] text-gray-400">{brands.length} brands / {columns} cols</span>
            </div>
            <div className="flex gap-1.5">
                {Array.from({ length: Math.min(brands.length || columns, 6) }).map((_, i) => (
                    <div key={i} className="flex-1 bg-teal-100 rounded h-6 flex items-center justify-center">
                        <span className="text-[8px] text-teal-700 font-medium truncate px-1">{brands[i]?.name || '—'}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Tag ──────────────────────────────────────────────────────────────────────

const TAG_COLORS: Record<string, string> = {
    hero_slider: 'bg-red-100 text-red-700',
    banner_grid: 'bg-blue-100 text-blue-700',
    flash_deal: 'bg-orange-100 text-orange-700',
    product_grid: 'bg-indigo-100 text-indigo-700',
    product_grid_with_panels: 'bg-rose-100 text-rose-700',
    category_grid: 'bg-purple-100 text-purple-700',
    brand_showcase: 'bg-teal-100 text-teal-700',
    service_grid: 'bg-amber-100 text-amber-700',
    post_grid: 'bg-green-100 text-green-700',
    custom_html: 'bg-gray-700 text-gray-200',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const SectionPreview: React.FC<SectionPreviewProps> = ({ sectionType, config, title }) => {
    const tagClass = TAG_COLORS[sectionType] ?? 'bg-gray-100 text-gray-600';

    const renderPreview = () => {
        switch (sectionType) {
            case 'hero_slider':   return <HeroSliderPreview config={config} />;
            case 'banner_grid':   return <BannerGridPreview config={config} />;
            case 'flash_deal':    return <FlashDealPreview config={config} />;
            case 'product_grid':  return <ProductGridPreview config={config} />;
            case 'product_grid_with_panels': return <ProductGridWithPanelsPreview config={config} />;
            case 'category_grid': return <CategoryGridPreview config={config} />;
            case 'brand_showcase': return <BrandShowcasePreview config={config} />;
            case 'service_grid':  return <ServiceGridPreview config={config} />;
            case 'post_grid':     return <PostGridPreview config={config} />;
            case 'custom_html':   return <CustomHtmlPreview config={config} />;
            default:              return <GenericPreview sectionType={sectionType} config={config} />;
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${tagClass}`}>
                    {sectionType.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-gray-500 truncate">{title}</span>
            </div>
            {renderPreview()}
        </div>
    );
};
