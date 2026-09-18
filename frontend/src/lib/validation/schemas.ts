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
 * Register / product / user / checkout schemas used to live here as
 * generic, undifferentiated versions (W1-9, step 6/7 cleanup — the phase
 * spec's own Overview: "most schemas are dead"). They are now colocated per
 * domain in `schemas/<domain>.ts`, mirroring the actual backend validators:
 * `schemas/register.ts`, `schemas/product.ts`, `schemas/user.ts`,
 * `schemas/checkout.ts`.
 *
 * `contactSchema` (also formerly here) was removed in the same cleanup pass
 * (adversarial-verification fix, W1-9): re-grepped and it had zero importers
 * — `pages/ContactPage.tsx` has always used its own hand-rolled
 * `ContactFormData`/`validateForm`, never this one. The original report
 * claimed this file was "trimmed to loginSchema+contactSchema (the only two
 * still imported anywhere)", which was false for `contactSchema`.
 */
