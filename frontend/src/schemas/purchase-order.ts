/**
 * Purchase Order schema — mirrors
 * `backend/Services/Inventory/Domain/PurchaseOrder.cs` (ctor:
 * `PurchaseOrder(supplierId, items, createdByUserId?, isUrgent?)`,
 * `PurchaseOrderItem(productId, quantity, unitPrice, productName?)`) and the
 * one guarded action, `Reject(reason)` (`:74-79`, throws without a reason).
 * No FluentValidation validator exists for this DTO on the backend — the
 * required-ness below matches the constructor's non-optional parameters;
 * length caps are UX-only.
 */
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, msg.required('Sản phẩm')),
  productName: z.string().max(200, msg.maxLength('Tên sản phẩm', 200)).optional(),
  quantity: z.number().int().min(1, msg.min('Số lượng', 1)),
  unitPrice: z.number().min(0, msg.min('Đơn giá', 0)),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, msg.requireSelect('Nhà cung cấp')),
  items: z.array(purchaseOrderItemSchema).min(1, msg.required('Danh sách hàng')),
  isUrgent: z.boolean().optional().default(false),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().max(1000, msg.maxLength('Ghi chú', 1000)).optional(),
});

export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

/** `PurchaseOrder.Reject(reason)` — required, backend throws on empty. */
export const purchaseOrderRejectSchema = z.object({
  reason: z.string().min(1, msg.required('Lý do từ chối')),
});

export type PurchaseOrderRejectFormData = z.infer<typeof purchaseOrderRejectSchema>;
