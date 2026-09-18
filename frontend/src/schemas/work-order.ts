/**
 * Work order (repair ticket) schema — mirrors
 * `backend/Services/Repair/Domain/WorkOrder.cs` ctor
 * `WorkOrder(customerId, deviceModel, serialNumber, description)`. No
 * FluentValidation validator exists for this DTO — required-ness matches
 * the constructor; length caps are UX-only.
 */
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

export const workOrderSchema = z.object({
  customerId: z.string().min(1, msg.required('Khách hàng')),
  deviceModel: z.string().min(1, msg.requireInput('Model thiết bị')).max(200, msg.maxLength('Model thiết bị', 200)),
  serialNumber: z.string().max(100, msg.maxLength('Số serial', 100)).optional(),
  description: z.string().min(1, msg.requireInput('Mô tả lỗi')).max(2000, msg.maxLength('Mô tả lỗi', 2000)),
});

export type WorkOrderFormData = z.infer<typeof workOrderSchema>;

/** Technician quote — `RepairQuote` fields the technician fills before sending for approval. */
export const repairQuoteSchema = z.object({
  partsCost: z.number().min(0, msg.min('Chi phí linh kiện', 0)),
  laborCost: z.number().min(0, msg.min('Chi phí nhân công', 0)),
  serviceFee: z.number().min(0, msg.min('Phí dịch vụ', 0)),
  estimatedHours: z.number().min(0, msg.min('Số giờ ước tính', 0)),
  hourlyRate: z.number().min(0, msg.min('Đơn giá/giờ', 0)),
  description: z.string().max(1000, msg.maxLength('Mô tả', 1000)).optional(),
  notes: z.string().max(1000, msg.maxLength('Ghi chú', 1000)).optional(),
});

export type RepairQuoteFormData = z.infer<typeof repairQuoteSchema>;
