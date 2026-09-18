/**
 * Register schema (`RegisterPage.tsx`, this track's one reference form).
 * Password mirrors `schemas/user.ts`'s `passwordPolicySchema` (same Identity
 * policy). `acceptDataPolicy` is D08's mandated consent checkbox (Luật
 * 122/2025 Đ11.4: cơ chế thể hiện sự đồng ý với Đ11.1 — chủ quản, chính sách
 * bảo mật, quyền & nghĩa vụ, kênh khiếu nại — TRƯỚC KHI mở tài khoản). This
 * track owns the field/validation; the checkbox's copy and exact placement
 * are W3-8's (account/auth track) per the phase file's Decision updates —
 * the label below is a safe placeholder for W3-8 to refine, not final copy.
 */
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';
import { passwordPolicySchema } from './user';

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, msg.requireInput('Họ và tên'))
      .max(200, msg.maxLength('Họ và tên', 200)),
    email: z.string().min(1, msg.requireInput('Email')).email(msg.email).max(256, msg.maxLength('Email', 256)),
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, msg.requireInput('Xác nhận mật khẩu')),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Vui lòng đồng ý với điều khoản sử dụng' }) }),
    /** D08 / Luật 122/2025 Đ11.4 — see file header. */
    acceptDataPolicy: z.literal(true, {
      errorMap: () => ({ message: 'Vui lòng đồng ý để tiếp tục đăng ký' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: msg.passwordMismatch,
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
