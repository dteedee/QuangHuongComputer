/**
 * Warranty claim schema — mirrors
 * `backend/Services/Warranty/Domain/WarrantyClaim.cs` ctor
 * `WarrantyClaim(customerId, serialNumber, issueDescription,
 * preferredResolution?, attachmentUrls?, isManagerOverride?)`. No
 * FluentValidation validator exists for this DTO — required-ness matches
 * the constructor; length caps are UX-only.
 */
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

export const warrantyClaimSchema = z.object({
  serialNumber: z.string().min(1, msg.requireInput('Số serial')),
  issueDescription: z
    .string()
    .min(1, msg.requireInput('Mô tả lỗi'))
    .max(2000, msg.maxLength('Mô tả lỗi', 2000)),
  preferredResolution: z.enum(['Repair', 'Replace', 'Refund']).optional().default('Repair'),
  attachmentUrls: z.array(z.string()).optional(),
  accessoriesReceived: z.string().max(500, msg.maxLength('Phụ kiện kèm theo', 500)).optional(),
  receivedCondition: z.string().max(500, msg.maxLength('Tình trạng máy', 500)).optional(),
});

export type WarrantyClaimFormData = z.infer<typeof warrantyClaimSchema>;
