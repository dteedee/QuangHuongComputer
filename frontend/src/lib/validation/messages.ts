/**
 * Vietnamese Error Messages for Form Validation
 */

export const validationMessages = {
  required: (field: string) => `${field} là bắt buộc`,
  requireInput: (field: string) => `Vui lòng nhập ${field.toLowerCase()}`,
  requireSelect: (field: string) => `${field} là bắt buộc`,
  email: 'Email không hợp lệ',
  minLength: (field: string, min: number) =>
    `${field} phải có ít nhất ${min} ký tự`,
  maxLength: (field: string, max: number) =>
    `${field} không được vượt quá ${max} ký tự`,
  min: (field: string, min: number) => `${field} phải lớn hơn hoặc bằng ${min}`,
  max: (field: string, max: number) =>
    `${field} phải nhỏ hơn hoặc bằng ${max}`,
  pattern: (field: string) => `${field} không đúng định dạng`,
  phone: 'Số điện thoại không hợp lệ',
  passwordMismatch: 'Mật khẩu xác nhận không khớp',
  /** Legacy text — kept for any other caller, but overstates the actual
   * Identity policy (uppercase/digit are NOT required). Prefer
   * `passwordNeedsLowercase` for anything checking the real policy
   * (`schemas/user.ts:passwordPolicySchema`, W1-9). */
  passwordWeak:
    'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số',
  /** Matches the actual Identity policy mirrored by `passwordPolicySchema`
   * (`Identity/DependencyInjection.cs:36-39`): min 6 chars + 1 lowercase,
   * nothing else required. Adversarial-verification fix, W1-9: the schema
   * used to attach `passwordWeak` here, which falsely told users they also
   * needed an uppercase letter and a digit. */
  passwordNeedsLowercase: 'Mật khẩu phải có ít nhất 6 ký tự và chứa ít nhất 1 chữ thường',
} as const;
