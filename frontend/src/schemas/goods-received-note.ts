/**
 * GRN (goods-received-note / phiếu nhập kho) schema — mirrors
 * `backend/Services/Inventory/Validators/CreateGRNDtoValidator.cs`.
 */
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

export const grnItemSchema = z.object({
  productId: z.string().min(1, msg.required('Sản phẩm')),
  productName: z.string().min(1, msg.required('Tên sản phẩm')),
  quantity: z.number().int().min(1, msg.min('Số lượng', 1)),
  unitCost: z.number().min(0, msg.min('Đơn giá', 0)),
});

export const grnSchema = z.object({
  purchaseOrderId: z.string().optional(),
  supplierId: z.string().min(1, msg.requireSelect('Nhà cung cấp')),
  receivedBy: z.string().min(1, msg.required('Người nhận hàng')),
  items: z.array(grnItemSchema).min(1, msg.required('Danh sách hàng nhập')),
  notes: z.string().max(1000, msg.maxLength('Ghi chú', 1000)).optional(),
});

export type GrnFormData = z.infer<typeof grnSchema>;
