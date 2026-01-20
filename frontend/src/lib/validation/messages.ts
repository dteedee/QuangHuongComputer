/**
 * Vietnamese Error Messages for Form Validation
 */

export const validationMessages = {
  required: (field: string) => `${field} là bắt buộc`,
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
  passwordWeak:
    'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số',
} as const;
