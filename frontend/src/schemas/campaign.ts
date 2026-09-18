/**
 * Email campaign schema — mirrors
 * `backend/Services/CRM/Domain/EmailCampaign.cs` (`Name`, `Subject`,
 * `HtmlContent` are the non-nullable `string.Empty`-defaulted fields; the
 * rest are optional targeting filters). No FluentValidation validator
 * exists for this DTO — length caps are UX-only.
 */
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

export const campaignSchema = z.object({
  name: z.string().min(1, msg.requireInput('Tên chiến dịch')).max(200, msg.maxLength('Tên chiến dịch', 200)),
  subject: z.string().min(1, msg.requireInput('Tiêu đề email')).max(200, msg.maxLength('Tiêu đề email', 200)),
  previewText: z.string().max(200, msg.maxLength('Preview text', 200)).optional(),
  htmlContent: z.string().min(1, msg.requireInput('Nội dung email')),
  plainTextContent: z.string().optional(),
  targetSegmentId: z.string().optional(),
  minRfmScore: z.number().int().min(0).max(100).optional(),
  scheduledAt: z.string().optional(),
});

export type CampaignFormData = z.infer<typeof campaignSchema>;
