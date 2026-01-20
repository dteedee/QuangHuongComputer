import { z } from 'zod';

// Post type enum
export const postTypeEnum = z.enum(['Article', 'News', 'Promotion', 'Banner', 'Ad']);

// Post category validation
const categorySchema = z.string()
  .min(1, 'Category is required')
  .max(100, 'Category must be less than 100 characters')
  .trim();

// Post title validation
const titleSchema = z.string()
  .min(1, 'Title is required')
  .min(5, 'Title must be at least 5 characters')
  .max(255, 'Title must be less than 255 characters')
  .trim();

// Post slug validation
const slugSchema = z.string()
  .min(1, 'Slug is required')
  .max(255, 'Slug must be less than 255 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens only')
  .trim();

// Post content validation
const contentSchema = z.string()
  .min(1, 'Content is required')
  .min(50, 'Content must be at least 50 characters');

// Featured image URL validation (optional)
const imageUrlSchema = z.string()
  .url('Invalid URL format')
  .optional()
  .or(z.literal(''));

// Tags validation (optional)
const tagsSchema = z.array(z.string())
  .optional()
  .default([]);

// Create Post Schema
export const createPostSchema = z.object({
  title: titleSchema,
  slug: slugSchema,
  content: contentSchema,
  featuredImage: imageUrlSchema,
  category: categorySchema,
  tags: tagsSchema,
  type: postTypeEnum.default('Article'),
  isPublished: z.boolean().default(false),
});

// Update Post Schema (all fields optional except id)
export const updatePostSchema = z.object({
  title: titleSchema.optional(),
  slug: slugSchema.optional(),
  content: contentSchema.optional(),
  featuredImage: imageUrlSchema,
  category: categorySchema.optional(),
  tags: tagsSchema,
  type: postTypeEnum.optional(),
  isPublished: z.boolean().optional(),
});

// Coupon discount type enum
export const discountTypeEnum = z.enum(['Percentage', 'FixedAmount']);

// Coupon code validation
const couponCodeSchema = z.string()
  .min(1, 'Coupon code is required')
  .min(3, 'Coupon code must be at least 3 characters')
  .max(50, 'Coupon code must be less than 50 characters')
  .regex(/^[A-Z0-9_-]+$/, 'Coupon code must be uppercase alphanumeric with underscores or hyphens')
  .trim();

// Description validation
const descriptionSchema = z.string()
  .min(1, 'Description is required')
  .max(500, 'Description must be less than 500 characters')
  .trim();

// Discount value validation
const discountValueSchema = z.number()
  .positive('Discount value must be positive')
  .finite('Discount value must be finite');

// Min order amount validation
const minOrderAmountSchema = z.number()
  .nonnegative('Minimum order amount cannot be negative')
  .finite('Minimum order amount must be finite')
  .default(0);

// Max discount validation (optional)
const maxDiscountSchema = z.number()
  .positive('Maximum discount must be positive')
  .finite('Maximum discount must be finite')
  .optional();

// Usage limit validation (optional)
const usageLimitSchema = z.number()
  .int('Usage limit must be an integer')
  .positive('Usage limit must be positive')
  .optional();

// Date validation
const dateSchema = z.string()
  .min(1, 'Date is required')
  .refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  });

// Create Coupon Schema
export const createCouponSchema = z.object({
  code: couponCodeSchema,
  description: descriptionSchema,
  discountType: discountTypeEnum,
  discountValue: discountValueSchema,
  minOrderAmount: minOrderAmountSchema,
  maxDiscount: maxDiscountSchema,
  usageLimit: usageLimitSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  isActive: z.boolean().default(true),
}).refine((data) => {
  // Validate that endDate is after startDate
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
}).refine((data) => {
  // Validate percentage discount is <= 100
  if (data.discountType === 'Percentage' && data.discountValue > 100) {
    return false;
  }
  return true;
}, {
  message: 'Percentage discount cannot exceed 100%',
  path: ['discountValue'],
});

// Update Coupon Schema (all fields optional)
export const updateCouponSchema = z.object({
  code: couponCodeSchema.optional(),
  description: descriptionSchema.optional(),
  discountType: discountTypeEnum.optional(),
  discountValue: discountValueSchema.optional(),
  minOrderAmount: minOrderAmountSchema.optional(),
  maxDiscount: maxDiscountSchema,
  usageLimit: usageLimitSchema,
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  isActive: z.boolean().optional(),
}).refine((data) => {
  // Validate that endDate is after startDate if both are provided
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end > start;
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
}).refine((data) => {
  // Validate percentage discount is <= 100
  if (data.discountType === 'Percentage' && data.discountValue && data.discountValue > 100) {
    return false;
  }
  return true;
}, {
  message: 'Percentage discount cannot exceed 100%',
  path: ['discountValue'],
});

// Type inference
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

// Helper functions to validate and clean form data
export function validatePostData(data: unknown, isUpdate = false) {
  const schema = isUpdate ? updatePostSchema : createPostSchema;
  return schema.parse(data);
}

export function validateCouponData(data: unknown, isUpdate = false) {
  const schema = isUpdate ? updateCouponSchema : createCouponSchema;
  return schema.parse(data);
}

// Helper function to generate slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}
