import type { UseFormReturn } from 'react-hook-form';
import { Tab, TabList, TabPanel, Tabs } from '../../../components/ui';
import ProductMediaManager from '../../../components/admin/product-media-manager';
import ProductVariantEditor from '../../../components/admin/product-variant-editor';
import SpecificationEditor from '../../../components/admin/specification-editor';
import { ProductBasicSection } from './sections/product-basic-section';
import { ProductPricingSection } from './sections/product-pricing-section';
import { ProductInventorySection } from './sections/product-inventory-section';
import { ProductWarrantySection } from './sections/product-warranty-section';
import { ProductSeoSection } from './sections/product-seo-section';
import { ProductPriceHistorySection } from './sections/product-price-history-section';
import type { ProductEditorValues } from './product-editor-schema';
import type { Product } from '../../../api/catalog/types';

interface Props {
  form: UseFormReturn<ProductEditorValues>;
  product?: Product;
  categories: Array<{ value: string; label: string }>;
  brands: Array<{ value: string; label: string }>;
  tab: string;
  onTabChange: (tab: string) => void;
  onMediaChanged: () => void;
}

/**
 * Các tab của trình sửa sản phẩm. TẤT CẢ đọc/ghi CÙNG một `form` — Radix có
 * unmount panel ẩn thì RHF vẫn giữ nguyên giá trị (`shouldUnregister` mặc
 * định `false`), nên lưu từ tab Giá không còn xoá khối lượng hay ngưỡng tồn.
 */
export function ProductEditorTabs({
  form, product, categories, brands, tab, onTabChange, onMediaChanged,
}: Props) {
  const isNew = !product;
  return (
    <Tabs value={tab} onValueChange={onTabChange}>
      <TabList aria-label="Nhóm thông tin sản phẩm">
        <Tab value="basic">Chung</Tab>
        <Tab value="pricing">Giá bán</Tab>
        <Tab value="inventory">Kho</Tab>
        <Tab value="warranty">Bảo hành</Tab>
        <Tab value="media" disabled={isNew}>Hình ảnh</Tab>
        <Tab value="specs" disabled={isNew}>Thông số</Tab>
        <Tab value="variants" disabled={isNew}>Biến thể</Tab>
        <Tab value="seo">SEO</Tab>
        <Tab value="history" disabled={isNew}>Lịch sử giá</Tab>
      </TabList>

      <TabPanel value="basic">
        <ProductBasicSection form={form} categories={categories} brands={brands} />
      </TabPanel>
      <TabPanel value="pricing"><ProductPricingSection form={form} /></TabPanel>
      <TabPanel value="inventory"><ProductInventorySection form={form} product={product} /></TabPanel>
      <TabPanel value="warranty"><ProductWarrantySection form={form} /></TabPanel>
      <TabPanel value="media">
        {product && <ProductMediaManager productId={product.id} onChanged={onMediaChanged} />}
      </TabPanel>
      <TabPanel value="specs">
        {product && <SpecificationEditor productId={product.id} categoryId={form.watch('categoryId')} />}
      </TabPanel>
      <TabPanel value="variants">
        {product && <ProductVariantEditor productId={product.id} />}
      </TabPanel>
      <TabPanel value="seo"><ProductSeoSection form={form} /></TabPanel>
      <TabPanel value="history">
        {product && <ProductPriceHistorySection productId={product.id} />}
      </TabPanel>
    </Tabs>
  );
}
