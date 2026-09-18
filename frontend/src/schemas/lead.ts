/**
 * Lead (CRM) schema — mirrors `backend/Services/CRM/Domain/Lead.cs` (ctor
 * `Lead(fullName, email, source)`; `Update(fullName, phone, company,
 * jobTitle, address, city, district, notes)`). No FluentValidation validator
 * exists for this DTO — required-ness matches the constructor/update
 * signatures; length caps are UX-only.
 */
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

export const leadSchema = z.object({
  fullName: z.string().min(1, msg.requireInput('Họ và tên')).max(200, msg.maxLength('Họ và tên', 200)),
  email: z.string().min(1, msg.requireInput('Email')).email(msg.email),
  phone: z.string().max(20, msg.maxLength('Số điện thoại', 20)).optional(),
  source: z.string().min(1, msg.requireSelect('Nguồn khách hàng')),
  company: z.string().max(200, msg.maxLength('Công ty', 200)).optional(),
  jobTitle: z.string().max(200, msg.maxLength('Chức danh', 200)).optional(),
  address: z.string().max(500, msg.maxLength('Địa chỉ', 500)).optional(),
  city: z.string().max(100, msg.maxLength('Tỉnh/thành', 100)).optional(),
  district: z.string().max(100, msg.maxLength('Quận/huyện', 100)).optional(),
  estimatedValue: z.number().min(0, msg.min('Giá trị ước tính', 0)).optional(),
  notes: z.string().max(2000, msg.maxLength('Ghi chú', 2000)).optional(),
});

export type LeadFormData = z.infer<typeof leadSchema>;
