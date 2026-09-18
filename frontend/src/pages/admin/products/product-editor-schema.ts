/**
 * Zod schema + DTO mapping for the admin product editor.
 *
 * Lives next to the page (wave-3 rule: `FE/schemas/**` is frozen, new schemas
 * live beside their screen). It extends `schemas/product.ts` with the retail
 * fields the backend really accepts — `CatalogDtos.cs:7-60`
 * (`CreateProductDto` / `UpdateProductDto`) — so nothing here is invented.
 *
 * The whole point of one schema for every tab: `form.getValues()` always
 * carries every field, whichever tab happens to be mounted. That is the
 * structural fix for the "saving from the pricing tab resets weight and the
 * low-stock threshold" bug (phase-30, Key Insights).
 */
import { z } from 'zod';
import { validationMessages as msg } from '../../../lib/validation/messages';
import type { CreateProductDto, Product, UpdateProductDto } from '../../../api/catalog/types';

const optionalMoney = (label: string) =>
  z.number({ invalid_type_error: msg.requireInput(label) }).min(0, msg.min(label, 0)).optional();

export const productEditorSchema = z
  .object({
    // --- cơ bản
    name: z.string().min(1, msg.requireInput('Tên sản phẩm')).max(200, msg.maxLength('Tên sản phẩm', 200)),
    sku: z.string().max(50, msg.maxLength('Mã SKU', 50)).optional(),
    categoryId: z.string().min(1, msg.requireSelect('Danh mục')),
    brandId: z.string().min(1, msg.requireSelect('Thương hiệu')),
    unitName: z.string().max(20, msg.maxLength('Đơn vị tính', 20)).optional(),
    description: z.string().max(4000, msg.maxLength('Mô tả', 4000)).optional(),

    // --- giá (VND nguyên, ĐÃ gồm VAT theo D01)
    price: z.number({ invalid_type_error: msg.requireInput('Giá bán') }).min(0, msg.min('Giá bán', 0)),
    oldPrice: optionalMoney('Giá niêm yết'),
    costPrice: optionalMoney('Giá vốn'),

    // --- kho
    stockQuantity: z
      .number({ invalid_type_error: msg.requireInput('Số lượng tồn') })
      .int(msg.pattern('Số lượng tồn'))
      .min(0, msg.min('Số lượng tồn', 0)),
    lowStockThreshold: z.number().int().min(0, msg.min('Ngưỡng sắp hết', 0)).optional(),
    barcode: z.string().max(64, msg.maxLength('Mã vạch', 64)).optional(),
    weight: z.number().min(0, msg.min('Khối lượng', 0)).optional(),

    // --- bảo hành (D08)
    warrantyMonths: z.number().int().min(0).max(120, msg.max('Bảo hành (tháng)', 120)).optional(),
    warrantyInfo: z.string().max(200, msg.maxLength('Ghi chú bảo hành', 200)).optional(),
    isReturnExcluded: z.boolean().optional(),

    // --- SEO
    slug: z.string().max(200, msg.maxLength('Đường dẫn', 200)).optional(),
    metaTitle: z.string().max(200, msg.maxLength('Tiêu đề SEO', 200)).optional(),
    metaDescription: z.string().max(500, msg.maxLength('Mô tả SEO', 500)).optional(),
    metaKeywords: z.string().max(300, msg.maxLength('Từ khoá SEO', 300)).optional(),
  })
  .refine((v) => v.oldPrice === undefined || v.oldPrice >= v.price, {
    path: ['oldPrice'],
    message: 'Giá niêm yết phải lớn hơn hoặc bằng giá bán.',
  });

export type ProductEditorValues = z.infer<typeof productEditorSchema>;

/** Every key of the form — passed to `applyServerErrors` as `knownFields`. */
export const PRODUCT_EDITOR_FIELDS = [
  'name', 'sku', 'categoryId', 'brandId', 'unitName', 'description',
  'price', 'oldPrice', 'costPrice',
  'stockQuantity', 'lowStockThreshold', 'barcode', 'weight',
  'warrantyMonths', 'warrantyInfo', 'isReturnExcluded',
  'slug', 'metaTitle', 'metaDescription', 'metaKeywords',
] as const satisfies ReadonlyArray<keyof ProductEditorValues>;

const nz = (v: string | null | undefined) => (v == null || v === '' ? undefined : v);
const nn = (v: number | null | undefined) => (v == null ? undefined : v);

/** Empty editor for `/backoffice/products/new`. */
export const emptyProductValues = (): ProductEditorValues => ({
  name: '', sku: '', categoryId: '', brandId: '', unitName: 'Chiếc', description: '',
  price: 0, oldPrice: undefined, costPrice: undefined,
  stockQuantity: 0, lowStockThreshold: 5, barcode: '', weight: undefined,
  warrantyMonths: undefined, warrantyInfo: '', isReturnExcluded: false,
  slug: '', metaTitle: '', metaDescription: '', metaKeywords: '',
});

/** Server row -> form values. */
export const productToFormValues = (p: Product): ProductEditorValues => ({
  name: p.name,
  sku: p.sku ?? '',
  categoryId: p.categoryId,
  brandId: p.brandId,
  unitName: nz(p.unitName) ?? 'Chiếc',
  description: p.description ?? '',
  price: p.price,
  oldPrice: nn(p.oldPrice),
  costPrice: nn(p.costPrice),
  stockQuantity: p.stockQuantity,
  lowStockThreshold: nn(p.lowStockThreshold) ?? 5,
  barcode: p.barcode ?? '',
  weight: nn(p.weight),
  warrantyMonths: nn(p.warrantyMonths),
  warrantyInfo: p.warrantyInfo ?? '',
  isReturnExcluded: p.isReturnExcluded ?? false,
  slug: p.slug ?? '',
  metaTitle: p.metaTitle ?? '',
  metaDescription: p.metaDescription ?? '',
  metaKeywords: p.metaKeywords ?? '',
});

/** Keys RHF marks dirty. `dirtyFields` is a partial bool map, not a value map. */
export type DirtyMap = Partial<Record<keyof ProductEditorValues, unknown>>;

/**
 * Only-dirty PATCH body. A field the user never touched is left OUT of the
 * JSON entirely, which is exactly what `UpdateProductDto`'s "null = không đụng
 * tới" contract needs — this is what stops a save from the pricing section
 * wiping `weight` / `lowStockThreshold`.
 */
export function toUpdateDto(values: ProductEditorValues, dirty: DirtyMap): UpdateProductDto {
  const dto: UpdateProductDto = {};
  const take = <K extends keyof ProductEditorValues>(key: K, apply: (v: ProductEditorValues[K]) => void) => {
    if (dirty[key]) apply(values[key]);
  };
  take('name', (v) => { dto.name = v; });
  take('sku', (v) => { dto.sku = v || undefined; });
  take('categoryId', (v) => { dto.categoryId = v; });
  take('brandId', (v) => { dto.brandId = v; });
  take('unitName', (v) => { dto.unitName = v || undefined; });
  take('description', (v) => { dto.description = v ?? ''; });
  take('price', (v) => { dto.price = v; });
  take('costPrice', (v) => { dto.costPrice = v; });
  take('stockQuantity', (v) => { dto.stockQuantity = v; });
  take('lowStockThreshold', (v) => { dto.lowStockThreshold = v; });
  take('barcode', (v) => { dto.barcode = v || undefined; });
  take('weight', (v) => { dto.weight = v; });
  take('warrantyInfo', (v) => { dto.warrantyInfo = v ?? ''; });
  take('isReturnExcluded', (v) => { dto.isReturnExcluded = v; });
  take('slug', (v) => { if (v) dto.slug = v; });
  take('metaTitle', (v) => { dto.metaTitle = v ?? ''; });
  take('metaDescription', (v) => { dto.metaDescription = v ?? ''; });
  take('metaKeywords', (v) => { dto.metaKeywords = v ?? ''; });
  // Nullables need the explicit Clear* flag — JSON cannot express "set to null".
  if (dirty.oldPrice) {
    if (values.oldPrice === undefined) dto.clearOldPrice = true;
    else dto.oldPrice = values.oldPrice;
  }
  if (dirty.warrantyMonths) {
    if (values.warrantyMonths === undefined) dto.clearWarrantyMonths = true;
    else dto.warrantyMonths = values.warrantyMonths;
  }
  return dto;
}

/** Create body — `CreateProductDto` requires name/description/price/cost/category/brand/stock. */
export function toCreateDto(v: ProductEditorValues): CreateProductDto {
  return {
    name: v.name,
    sku: v.sku || undefined,
    description: v.description ?? '',
    price: v.price,
    costPrice: v.costPrice ?? 0,
    categoryId: v.categoryId,
    brandId: v.brandId,
    stockQuantity: v.stockQuantity,
    barcode: v.barcode || undefined,
    weight: v.weight,
    warrantyInfo: v.warrantyInfo || undefined,
    warrantyMonths: v.warrantyMonths,
    isReturnExcluded: v.isReturnExcluded,
    unitName: v.unitName || undefined,
    metaTitle: v.metaTitle || undefined,
    metaDescription: v.metaDescription || undefined,
    metaKeywords: v.metaKeywords || undefined,
  };
}

/**
 * Các trường mà `CreateProductDto` KHÔNG mang được (nó không có
 * `LowStockThreshold`, `Slug`, `MetaTitle/Description/Keywords` —
 * `CatalogDtos.cs:7-23`). Trước đây người dùng điền tab Kho / SEO ở
 * `/backoffice/products/new` rồi bấm "Tạo sản phẩm" thì các giá trị đó biến mất
 * lặng lẽ. Sau khi tạo xong, trang gửi tiếp MỘT lệnh cập nhật chỉ với những
 * trường này, nên tạo sản phẩm trong một lượt không còn mất dữ liệu.
 *
 * `weight` / `barcode` KHÔNG nằm ở đây: máy chủ nhận nhưng không đọc lại được
 * (`ProductDtoProjection.cs` thiếu hai cột) và cũng không ghi khi thân yêu cầu
 * không có Name/Description/Price — xem yêu cầu tích hợp #18/#19.
 */
export function toPostCreateDto(v: ProductEditorValues): UpdateProductDto {
  const dto: UpdateProductDto = {};
  const base = emptyProductValues();
  if (v.lowStockThreshold !== undefined && v.lowStockThreshold !== base.lowStockThreshold) {
    dto.lowStockThreshold = v.lowStockThreshold;
  }
  if (v.slug) dto.slug = v.slug;
  if (v.metaTitle) dto.metaTitle = v.metaTitle;
  if (v.metaDescription) dto.metaDescription = v.metaDescription;
  if (v.metaKeywords) dto.metaKeywords = v.metaKeywords;
  return dto;
}
