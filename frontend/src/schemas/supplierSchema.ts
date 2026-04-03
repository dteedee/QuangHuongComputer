import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

// Phone regex for Vietnamese phone numbers (flexible to support various formats)
const phoneRegex = /^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/;

// Email validation
const emailSchema = z.string()
  .min(1, msg.requireInput('Email'))
  .email(msg.email)
  .max(255, msg.maxLength('Email', 255));

// Phone validation
const phoneSchema = z.string()
  .min(1, msg.requireInput('Số điện thoại'))
  .regex(phoneRegex, msg.phone)
  .max(20, msg.maxLength('Số điện thoại', 20));

// Name validation
const nameSchema = z.string()
  .min(1, msg.requireInput('Tên nhà cung cấp'))
  .min(2, msg.minLength('Tên nhà cung cấp', 2))
  .max(255, msg.maxLength('Tên nhà cung cấp', 255))
  .trim();

// Contact person validation
const contactPersonSchema = z.string()
  .min(1, msg.requireInput('Người liên hệ'))
  .min(2, msg.minLength('Người liên hệ', 2))
  .max(255, msg.maxLength('Người liên hệ', 255))
  .trim();

// Address validation (optional)
const addressSchema = z.string()
  .min(1, msg.requireInput('Địa chỉ'))
  .max(500, msg.maxLength('Địa chỉ', 500))
  .optional()
  .or(z.literal(''));

// Create Supplier Schema
export const createSupplierSchema = z.object({
  name: nameSchema,
  supplierType: z.string().min(1, msg.requireSelect('Loại nhà cung cấp')),
  paymentTerms: z.string().min(1, msg.requireSelect('Điều khoản thanh toán')),
  contactPerson: contactPersonSchema,
  email: emailSchema,
  phone: phoneSchema,
  address: addressSchema,
  
  // additional optional fields
  shortName: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  logoUrl: z.string().optional(),
  taxCode: z.string().optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  paymentDays: z.number().optional(),
  creditLimit: z.number().optional(),
  contactTitle: z.string().optional(),
  fax: z.string().optional(),
  ward: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  rating: z.number().optional(),
  notes: z.string().optional(),
  categories: z.string().optional(),
  brands: z.string().optional(),
});

// Update Supplier Schema (all fields optional)
export const updateSupplierSchema = z.object({
  name: nameSchema.optional(),
  contactPerson: contactPersonSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  address: addressSchema,
});

// Type inference
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

// Helper function to validate and clean form data
export function validateSupplierData(data: unknown, isUpdate = false) {
  const schema = isUpdate ? updateSupplierSchema : createSupplierSchema;
  return schema.parse(data);
}
