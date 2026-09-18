/**
 * Product schema (admin catalog form) — mirrors
 * `backend/Services/Catalog/Infrastructure/CatalogDbContext.cs:70-102`
 * (`Product.Name` maxLength 200, `Product.Sku` maxLength 50) and
 * `Domain/Product.cs:132-134` (price/costPrice must be >= 0). There is no
 * FluentValidation validator for Product on the backend; these are the only
 * two constraints the database itself enforces (`HasMaxLength`), so nothing
 * here is invented — everything else (description length, etc.) is a
 * generous UX-only cap, called out below.
 */
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

export const productSchema = z.object({
  name: z
    .string()
    .min(1, msg.requireInput('Tên sản phẩm'))
    .max(200, msg.maxLength('Tên sản phẩm', 200)),
  sku: z
    .string()
    .max(50, msg.maxLength('Mã SKU', 50))
    .optional(),
  description: z
    .string()
    // UX-only cap — backend column is unbounded text.
    .max(4000, msg.maxLength('Mô tả', 4000))
    .optional()
    .default(''),
  categoryId: z.string().min(1, msg.requireSelect('Danh mục')),
  brandId: z.string().min(1, msg.requireSelect('Thương hiệu')),
  price: z
    .number({ invalid_type_error: msg.requireInput('Giá bán') })
    .min(0, msg.min('Giá bán', 0)),
  oldPrice: z.number().min(0, msg.min('Giá niêm yết', 0)).optional(),
  costPrice: z.number().min(0, msg.min('Giá vốn', 0)).optional(),
  stockQuantity: z
    .number({ invalid_type_error: msg.requireInput('Số lượng tồn') })
    .int(msg.pattern('Số lượng tồn'))
    .min(0, msg.min('Số lượng tồn', 0)),
  lowStockThreshold: z.number().int().min(0).optional(),
  barcode: z.string().max(64, msg.maxLength('Barcode', 64)).optional(),
  weight: z.number().min(0, msg.min('Khối lượng', 0)).optional(),
  warrantyInfo: z.string().max(200, msg.maxLength('Bảo hành', 200)).optional(),
  metaTitle: z.string().max(200, msg.maxLength('Meta title', 200)).optional(),
  metaDescription: z.string().max(500, msg.maxLength('Meta description', 500)).optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;
