/**
 * HR schemas (employee / timesheet / payroll). Localized to Vietnamese
 * messages (W1-9, implementation step 6 — "employee" domain).
 * `employeeSchema` mirrors `backend/Services/HR/Infrastructure/HRDbContext.cs:45-64`
 * (`Employee` config): `FullName`/`Email` required maxLength 200, `Phone`
 * required maxLength 20, `EmployeeCode` maxLength 50 (unique),
 * `BaseSalary`/`HourlyRate` check-constrained >= 0. `timesheetSchema` /
 * `payrollSchema` have no dedicated EF config or FluentValidation validator
 * on the backend — their length caps are UX-only.
 */
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

// Employee Schema
export const employeeSchema = z.object({
    id: z.string().optional(),
    fullName: z.string().min(1, msg.requireInput('Họ và tên')).max(200, msg.maxLength('Họ và tên', 200)),
    email: z.string().min(1, msg.requireInput('Email')).email(msg.email).max(200, msg.maxLength('Email', 200)),
    phone: z.string().min(1, msg.requireInput('Số điện thoại')).max(20, msg.maxLength('Số điện thoại', 20)),
    department: z.string().min(1, msg.requireSelect('Phòng ban')),
    position: z.string().min(1, msg.requireSelect('Chức vụ')),
    baseSalary: z.number().min(0, msg.min('Lương cơ bản', 0)),
    hireDate: z.string().min(1, msg.requireInput('Ngày vào làm')),
    status: z.enum(['Active', 'Inactive', 'OnLeave']).default('Active'),
    address: z.string().max(500, msg.maxLength('Địa chỉ', 500)).optional(),
    emergencyContact: z.string().max(200, msg.maxLength('Liên hệ khẩn cấp', 200)).optional(),
});

export const createEmployeeSchema = employeeSchema.omit({ id: true });
export const updateEmployeeSchema = employeeSchema.partial().required({ id: true });

// Timesheet Schema
export const timesheetSchema = z.object({
    id: z.string().optional(),
    employeeId: z.string().min(1, msg.requireSelect('Nhân viên')),
    date: z.string().min(1, msg.requireInput('Ngày')),
    checkIn: z.string().min(1, msg.requireInput('Giờ vào')),
    checkOut: z.string().optional(),
    totalHours: z.number().min(0).max(24, msg.max('Tổng giờ', 24)),
    status: z.enum(['Pending', 'Approved', 'Rejected']).default('Pending'),
    notes: z.string().max(500, msg.maxLength('Ghi chú', 500)).optional(),
});

export const createTimesheetSchema = timesheetSchema.omit({ id: true });
export const updateTimesheetSchema = timesheetSchema.partial().required({ id: true });

// Payroll Schema
export const payrollSchema = z.object({
    id: z.string().optional(),
    employeeId: z.string().min(1, msg.requireSelect('Nhân viên')),
    period: z.string().min(1, msg.requireInput('Kỳ lương')),
    baseSalary: z.number().min(0, msg.min('Lương cơ bản', 0)),
    deductions: z.number().min(0, msg.min('Khấu trừ', 0)).default(0),
    bonuses: z.number().min(0, msg.min('Thưởng', 0)).default(0),
    netPay: z.number().min(0),
    status: z.enum(['Draft', 'Processed', 'Paid']).default('Draft'),
});

export const createPayrollSchema = payrollSchema.omit({ id: true, netPay: true });
export const updatePayrollSchema = payrollSchema.partial().required({ id: true });

// Type exports
export type EmployeeFormData = z.infer<typeof employeeSchema>;
export type CreateEmployeeData = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeData = z.infer<typeof updateEmployeeSchema>;

export type TimesheetFormData = z.infer<typeof timesheetSchema>;
export type CreateTimesheetData = z.infer<typeof createTimesheetSchema>;
export type UpdateTimesheetData = z.infer<typeof updateTimesheetSchema>;

export type PayrollFormData = z.infer<typeof payrollSchema>;
export type CreatePayrollData = z.infer<typeof createPayrollSchema>;
export type UpdatePayrollData = z.infer<typeof updatePayrollSchema>;
