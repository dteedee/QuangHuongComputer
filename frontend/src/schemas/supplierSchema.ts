import { z } from 'zod';

// Phone regex for Vietnamese phone numbers (flexible to support various formats)
const phoneRegex = /^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/;

// Email validation
const emailSchema = z.string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters');

// Phone validation
const phoneSchema = z.string()
  .min(1, 'Phone is required')
  .regex(phoneRegex, 'Invalid phone number format. Use format: 0XXXXXXXXX or +84XXXXXXXXX')
  .max(20, 'Phone must be less than 20 characters');

// Name validation
const nameSchema = z.string()
  .min(1, 'Name is required')
  .min(2, 'Name must be at least 2 characters')
  .max(255, 'Name must be less than 255 characters')
  .trim();

// Contact person validation
const contactPersonSchema = z.string()
  .min(1, 'Contact person is required')
  .min(2, 'Contact person must be at least 2 characters')
  .max(255, 'Contact person must be less than 255 characters')
  .trim();

// Address validation (optional)
const addressSchema = z.string()
  .max(500, 'Address must be less than 500 characters')
  .optional()
  .or(z.literal(''));

// Create Supplier Schema
export const createSupplierSchema = z.object({
  name: nameSchema,
  contactPerson: contactPersonSchema,
  email: emailSchema,
  phone: phoneSchema,
  address: addressSchema,
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
