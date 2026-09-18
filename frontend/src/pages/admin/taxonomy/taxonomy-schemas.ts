/**
 * Zod schema cho ngành hàng + thương hiệu (wave 3: schema mới nằm cạnh trang
 * dùng nó, `FE/schemas/**` đã đóng băng).
 *
 * Căn cứ backend: `CategoryConfiguration.cs` / `BrandConfiguration.cs`
 * (Name bắt buộc, 100 ký tự; Description 500) và `CatalogDtos.cs:62-106`
 * (các trường mở rộng của D01/D08).
 */
import { z } from 'zod';
import { validationMessages as msg } from '../../../lib/validation/messages';

/** Ba mức thuế suất luật định đang áp dụng (D01). Giá trị là PHÂN SỐ, không phải %. */
export const VAT_RATE_OPTIONS = [
  { value: '0', label: '0% — không chịu thuế' },
  { value: '0.05', label: '5%' },
  { value: '0.1', label: '10%' },
];

export const categoryFormSchema = z.object({
  name: z.string().min(1, msg.requireInput('Tên ngành hàng')).max(100, msg.maxLength('Tên ngành hàng', 100)),
  description: z.string().max(500, msg.maxLength('Mô tả', 500)).optional(),
  parentId: z.string().optional(),
  slug: z.string().max(200, msg.maxLength('Đường dẫn', 200)).optional(),
  imageUrl: z.string().optional(),
  icon: z.string().max(50, msg.maxLength('Biểu tượng', 50)).optional(),
  displayOrder: z.number().int().min(0).optional(),
  vatRate: z.string().min(1, msg.requireSelect('Thuế suất VAT')),
  vatReductionEligible: z.boolean().optional(),
  isSerialTracked: z.boolean().optional(),
  metaTitle: z.string().max(200, msg.maxLength('Tiêu đề SEO', 200)).optional(),
  metaDescription: z.string().max(500, msg.maxLength('Mô tả SEO', 500)).optional(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const CATEGORY_FIELDS = [
  'name', 'description', 'parentId', 'slug', 'imageUrl', 'icon', 'displayOrder',
  'vatRate', 'vatReductionEligible', 'isSerialTracked', 'metaTitle', 'metaDescription',
] as const;

export const brandFormSchema = z.object({
  name: z.string().min(1, msg.requireInput('Tên thương hiệu')).max(100, msg.maxLength('Tên thương hiệu', 100)),
  description: z.string().max(500, msg.maxLength('Mô tả', 500)).optional(),
  slug: z.string().max(200, msg.maxLength('Đường dẫn', 200)).optional(),
  logoUrl: z.string().optional(),
  website: z
    .string()
    .url('Website phải là đường dẫn hợp lệ, bắt đầu bằng http:// hoặc https://')
    .optional()
    .or(z.literal('')),
  displayOrder: z.number().int().min(0).optional(),
});

export type BrandFormValues = z.infer<typeof brandFormSchema>;

export const BRAND_FIELDS = ['name', 'description', 'slug', 'logoUrl', 'website', 'displayOrder'] as const;

export const specGroupSchema = z.object({
  name: z.string().min(1, msg.requireInput('Tên nhóm')).max(100, msg.maxLength('Tên nhóm', 100)),
  categoryId: z.string().optional(),
  sortOrder: z.number().int().min(0),
});
export type SpecGroupFormValues = z.infer<typeof specGroupSchema>;

export const specAttributeSchema = z.object({
  key: z
    .string()
    .min(1, msg.requireInput('Mã thuộc tính'))
    .max(50, msg.maxLength('Mã thuộc tính', 50))
    .regex(/^[a-z0-9_]+$/, 'Mã chỉ gồm chữ thường, số và dấu gạch dưới.'),
  name: z.string().min(1, msg.requireInput('Tên hiển thị')).max(100, msg.maxLength('Tên hiển thị', 100)),
  dataType: z.enum(['Text', 'Number', 'Boolean', 'Enum']),
  unit: z.string().max(20, msg.maxLength('Đơn vị', 20)).optional(),
  enumValuesJson: z.string().optional(),
  isFilterable: z.boolean(),
  isComparable: z.boolean(),
  sortOrder: z.number().int().min(0),
});
export type SpecAttributeFormValues = z.infer<typeof specAttributeSchema>;
