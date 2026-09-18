/**
 * Brand schema — mirrors
 * `backend/Services/Catalog/Infrastructure/Data/Configurations/BrandConfiguration.cs:15-21`
 * (`Name` required, maxLength 100; `Description` maxLength 500).
 */
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

export const brandSchema = z.object({
  name: z
    .string()
    .min(1, msg.requireInput('Tên thương hiệu'))
    .max(100, msg.maxLength('Tên thương hiệu', 100)),
  description: z
    .string()
    .max(500, msg.maxLength('Mô tả', 500))
    .optional()
    .default(''),
  isActive: z.boolean().optional(),
});

export type BrandFormData = z.infer<typeof brandSchema>;
