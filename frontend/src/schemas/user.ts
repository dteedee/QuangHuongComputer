/**
 * User (admin) schemas — mirrors
 * `backend/Services/Identity/Validators/UserAdminRequestValidators.cs`:
 * `CreateUserDtoValidator` (email required/valid/<=256, password required
 * 6-128 chars, fullName required <=200) and `UpdateUserDtoValidator` (no
 * password field — the backend has no "admin sets a new password" endpoint
 * today, see `docs/frontend-form-kit.md` / integration request). Password
 * strength mirrors `Identity/DependencyInjection.cs:36-39`
 * (`RequireDigit=false, RequiredLength=6, RequireNonAlphanumeric=false,
 * RequireUppercase=false` — `RequireLowercase` is NOT overridden there, so
 * ASP.NET Identity's default `true` still applies): minimum 6 characters,
 * at least one lowercase letter, nothing else required.
 */
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

const emailField = z
  .string()
  .min(1, msg.requireInput('Email'))
  .email(msg.email)
  .max(256, msg.maxLength('Email', 256));

const fullNameField = z
  .string()
  .min(1, msg.requireInput('Họ và tên'))
  .max(200, msg.maxLength('Họ và tên', 200));

/** Exact mirror of the Identity password policy — see file header. */
export const passwordPolicySchema = z
  .string()
  .min(6, msg.minLength('Mật khẩu', 6))
  .max(128, msg.maxLength('Mật khẩu', 128))
  .regex(/[a-z]/, msg.passwordNeedsLowercase);

const roleNameField = z.string().min(1, msg.requireInput('Vai trò')).max(64, msg.maxLength('Vai trò', 64));

export const createUserSchema = z.object({
  email: emailField,
  password: passwordPolicySchema,
  fullName: fullNameField,
  roles: z.array(roleNameField).min(1, msg.requireSelect('Vai trò')),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  email: emailField,
  fullName: fullNameField,
  roles: z.array(roleNameField).optional(),
});

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;

/** `AssignRolesDtoValidator` — an empty array is legal (strips every role); `null`/undefined is not. */
export const assignRolesSchema = z.object({
  roles: z.array(roleNameField),
});

export type AssignRolesFormData = z.infer<typeof assignRolesSchema>;
