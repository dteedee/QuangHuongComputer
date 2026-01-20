import { z } from 'zod';
import { validationMessages as msg } from './messages';

/**
 * Login Schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, msg.required('Email'))
    .email(msg.email),
  password: z.string().min(1, msg.required('Mật khẩu')),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Register Schema
 */
export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, msg.required('Họ và tên'))
      .min(2, msg.minLength('Họ và tên', 2))
      .max(100, msg.maxLength('Họ và tên', 100)),
    email: z
      .string()
      .min(1, msg.required('Email'))
      .email(msg.email),
    password: z
      .string()
      .min(1, msg.required('Mật khẩu'))
      .min(6, msg.minLength('Mật khẩu', 6))
      .max(100, msg.maxLength('Mật khẩu', 100)),
    confirmPassword: z.string().min(1, msg.required('Xác nhận mật khẩu')),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: msg.passwordMismatch,
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Contact Schema
 */
export const contactSchema = z.object({
  name: z
    .string()
    .min(1, msg.required('Họ và tên'))
    .min(2, msg.minLength('Họ và tên', 2)),
  phone: z
    .string()
    .min(1, msg.required('Số điện thoại'))
    .regex(/^[0-9]{10,11}$/, msg.phone),
  email: z
    .string()
    .min(1, msg.required('Email'))
    .email(msg.email),
  message: z
    .string()
    .min(1, msg.required('Nội dung'))
    .min(10, msg.minLength('Nội dung', 10))
    .max(1000, msg.maxLength('Nội dung', 1000)),
});

export type ContactFormData = z.infer<typeof contactSchema>;

/**
 * Checkout Schema
 */
export const checkoutSchema = z.object({
  shippingAddress: z
    .string()
    .min(1, msg.required('Địa chỉ giao hàng'))
    .min(10, msg.minLength('Địa chỉ giao hàng', 10))
    .max(500, msg.maxLength('Địa chỉ giao hàng', 500)),
  note: z
    .string()
    .max(500, msg.maxLength('Ghi chú', 500))
    .optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

/**
 * Product Schema (Admin)
 */
export const productSchema = z.object({
  name: z
    .string()
    .min(1, msg.required('Tên sản phẩm'))
    .min(3, msg.minLength('Tên sản phẩm', 3))
    .max(200, msg.maxLength('Tên sản phẩm', 200)),
  description: z
    .string()
    .max(2000, msg.maxLength('Mô tả', 2000))
    .optional(),
  price: z
    .number({ invalid_type_error: msg.required('Giá bán') })
    .min(0, msg.min('Giá bán', 0))
    .max(1000000000, msg.max('Giá bán', 1000000000)),
  categoryId: z.string().min(1, msg.required('Danh mục')),
  brandId: z.string().min(1, msg.required('Thương hiệu')),
  stockQuantity: z
    .number({ invalid_type_error: msg.required('Số lượng tồn') })
    .min(0, msg.min('Số lượng tồn', 0))
    .max(100000, msg.max('Số lượng tồn', 100000)),
});

export type ProductFormData = z.infer<typeof productSchema>;

/**
 * User Schema (Admin)
 */
export const userSchema = z.object({
  fullName: z
    .string()
    .min(1, msg.required('Họ và tên'))
    .min(2, msg.minLength('Họ và tên', 2))
    .max(100, msg.maxLength('Họ và tên', 100)),
  email: z
    .string()
    .min(1, msg.required('Email'))
    .email(msg.email),
  password: z
    .string()
    .min(6, msg.minLength('Mật khẩu', 6))
    .max(100, msg.maxLength('Mật khẩu', 100))
    .optional(),
  roles: z.array(z.string()).min(1, msg.required('Vai trò')),
});

export type UserFormData = z.infer<typeof userSchema>;
