import React from 'react';
import { motion } from 'framer-motion';
import { HomepageSection } from '../api/content';
import { HeroSlider } from './homepage/HeroSlider';
import { BannerGrid } from './homepage/BannerGrid';
import { FlashDeal } from './homepage/FlashDeal';
import { ProductGridSection } from './homepage/ProductGridSection';
import { CategoryGridSection } from './homepage/CategoryGridSection';
import { ServiceGrid } from './homepage/ServiceGrid';
import { PostGridSection } from './homepage/PostGridSection';
import { CustomHtml } from './homepage/CustomHtml';

interface DynamicHomepageProps {
    sections: HomepageSection[];
}

const SECTION_COMPONENTS: Record<string, React.ComponentType<any>> = {
    'hero_slider': HeroSlider,
    'banner_grid': BannerGrid,
    'flash_deal': FlashDeal,
    'product_grid': ProductGridSection,
    'category_grid': CategoryGridSection,
    'service_grid': ServiceGrid,
    'post_grid': PostGridSection,
    'custom_html': CustomHtml
};

export const DynamicHomepage: React.FC<DynamicHomepageProps> = ({ sections }) => {
    return (
        <div className="space-y-12 pb-20">
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
                    <motion.section
                        key={section.id}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                        className={section.cssClass}
                    >
                        <Component 
                            title={section.title}
                            config={config}
                        />
                    </motion.section>
                );
            })}
        </div>
    );
};
