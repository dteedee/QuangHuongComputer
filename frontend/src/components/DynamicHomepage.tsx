import React from 'react';
import type { HomepageSection } from '../api/content';
import { HeroSlider } from './homepage/HeroSlider';
import { BannerGrid } from './homepage/BannerGrid';
import { FlashDeal } from './homepage/FlashDeal';
import { ProductGridSection } from './homepage/ProductGridSection';
import { CategoryGridSection } from './homepage/CategoryGridSection';
import { ServiceGrid } from './homepage/ServiceGrid';
import { PostGridSection } from './homepage/PostGridSection';
import { CustomHtml } from './homepage/CustomHtml';
import { ProductGridWithPanels } from './homepage/ProductGridWithPanels';
import { BrandShowcase } from './homepage/BrandShowcase';
import { Reveal } from './motion';

interface DynamicHomepageProps {
    sections: HomepageSection[];
}

const SECTION_COMPONENTS: Record<string, React.ComponentType<any>> = {
    'hero_slider': HeroSlider,
    'banner_grid': BannerGrid,
    'flash_deal': FlashDeal,
    'product_grid': ProductGridSection,
    'product_grid_with_panels': ProductGridWithPanels,
    'category_grid': CategoryGridSection,
    'service_grid': ServiceGrid,
    'brand_showcase': BrandShowcase,
    'post_grid': PostGridSection,
    'custom_html': CustomHtml
};

export const DynamicHomepage: React.FC<DynamicHomepageProps> = ({ sections }) => {
    return (
        <div className="space-y-16 md:space-y-24 pb-24 max-w-[1400px] mx-auto px-4 mt-8">
            {sections.map((section, index) => {
                const Component = SECTION_COMPONENTS[section.sectionType];
                if (!Component) {
                    console.warn(`Unknown section type: ${section.sectionType}`);
                    return null;
                }

                let config = {};
                try {
                    config = section.configuration ? JSON.parse(section.configuration) : {};
                } catch (e) {
                    console.error(`Failed to parse configuration for section ${section.id}`, e);
                }

                return (
                    <Reveal
                        key={section.id}
                        as="section"
                        index={index}
                        className={section.cssClass || undefined}
                    >
                        <Component 
                            title={section.title}
                            config={config}
                        />
                    </Reveal>
                );
            })}
        </div>
    );
};
