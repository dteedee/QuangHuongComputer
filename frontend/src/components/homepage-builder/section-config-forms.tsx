/**
 * Registry mapping section type codes to their visual config form components.
 * Import getSectionConfigForm() to look up the right form for any section type.
 */
import React from 'react';
import { type ConfigFormProps } from './section-configs/section-config-form-helpers';
import { HeroSliderConfig } from './section-configs/hero-slider-config';
import { BannerGridConfig } from './section-configs/banner-grid-config';
import { FlashDealConfig } from './section-configs/flash-deal-config';
import { ProductGridConfig } from './section-configs/product-grid-config';
import { CategoryGridConfig } from './section-configs/category-grid-config';
import { ServiceGridConfig } from './section-configs/service-grid-config';
import { PostGridConfig } from './section-configs/post-grid-config';
import { CustomHtmlConfig } from './section-configs/custom-html-config';
import { GenericConfig } from './section-configs/generic-config';
import { ProductGridWithPanelsConfig } from './section-configs/product-grid-with-panels-config';
import { BrandShowcaseConfig } from './section-configs/brand-showcase-config';

export type { ConfigFormProps };

const REGISTRY: Record<string, React.FC<ConfigFormProps>> = {
    hero_slider:               HeroSliderConfig,
    banner_grid:               BannerGridConfig,
    flash_deal:                FlashDealConfig,
    product_grid:              ProductGridConfig,
    product_grid_with_panels:  ProductGridWithPanelsConfig,
    category_grid:             CategoryGridConfig,
    brand_showcase:            BrandShowcaseConfig,
    service_grid:              ServiceGridConfig,
    post_grid:                 PostGridConfig,
    custom_html:               CustomHtmlConfig,
};

export function getSectionConfigForm(sectionType: string): React.FC<ConfigFormProps> {
    return REGISTRY[sectionType] ?? GenericConfig;
}
