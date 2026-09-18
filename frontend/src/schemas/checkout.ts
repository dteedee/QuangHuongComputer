/**
 * Checkout schema — mirrors
 * `backend/Services/Sales/Validators/CheckoutValidators.cs`
 * (`CheckoutDtoValidator` / `CheckoutOrchestratorRequestDtoValidator`):
 * recipient name <=200, VN phone `^(0|+84)[0-9]{9,10}$`, shipping address
 * required unless pickup, quantity 1-99 per line (`MaxQuantityPerLine`).
 */
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

const VN_PHONE = /^(0|\+84)[0-9]{9,10}$/;
/** `CheckoutDtoValidator.MaxQuantityPerLine` (`CheckoutValidators.cs:49`). */
export const MAX_QUANTITY_PER_LINE = 99;

export const checkoutItemSchema = z.object({
  productId: z.string().min(1, msg.required('Sản phẩm')),
  productName: z.string().optional(),
  unitPrice: z.number().min(0),
  quantity: z
    .number()
    .int()
    .min(1, msg.min('Số lượng', 1))
    .max(MAX_QUANTITY_PER_LINE, msg.max('Số lượng', MAX_QUANTITY_PER_LINE)),
});

export const checkoutSchema = z
  .object({
    items: z.array(checkoutItemSchema).min(1, msg.required('Giỏ hàng')),
    isPickup: z.boolean().optional().default(false),
    shippingAddress: z.string().max(500, msg.maxLength('Địa chỉ giao hàng', 500)).optional(),
    recipientName: z.string().max(200, msg.maxLength('Tên người nhận', 200)).optional(),
    recipientPhone: z
      .string()
      .regex(VN_PHONE, msg.phone)
      .optional()
      .or(z.literal('')),
    notes: z.string().max(500, msg.maxLength('Ghi chú', 500)).optional(),
    couponCode: z.string().optional(),
    paymentMethod: z.string().min(1, msg.requireSelect('Phương thức thanh toán')),
  })
  .refine((data) => data.isPickup || (data.shippingAddress && data.shippingAddress.trim().length > 0), {
    message: msg.requireInput('Địa chỉ giao hàng'),
    path: ['shippingAddress'],
  });

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
