/**
 * Category schema — mirrors
 * `backend/Services/Catalog/Infrastructure/Data/Configurations/CategoryConfiguration.cs:15-21`
 * (`Name` required, maxLength 100; `Description` maxLength 500).
 */
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, msg.requireInput('Tên danh mục'))
    .max(100, msg.maxLength('Tên danh mục', 100)),
  description: z
    .string()
    .max(500, msg.maxLength('Mô tả', 500))
    .optional()
    .default(''),
  isActive: z.boolean().optional(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
