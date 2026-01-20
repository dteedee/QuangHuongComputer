import { z } from 'zod';

// Employee Schema
export const employeeSchema = z.object({
    id: z.string().optional(),
    fullName: z.string().min(1, 'Full name is required').max(100, 'Full name is too long'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    department: z.string().min(1, 'Department is required'),
    position: z.string().min(1, 'Position is required'),
    baseSalary: z.number().min(0, 'Base salary must be positive'),
    hireDate: z.string().min(1, 'Hire date is required'),
    status: z.enum(['Active', 'Inactive', 'OnLeave']).default('Active'),
    address: z.string().optional(),
    emergencyContact: z.string().optional(),
});

export const createEmployeeSchema = employeeSchema.omit({ id: true });
export const updateEmployeeSchema = employeeSchema.partial().required({ id: true });

// Timesheet Schema
export const timesheetSchema = z.object({
    id: z.string().optional(),
    employeeId: z.string().min(1, 'Employee is required'),
    date: z.string().min(1, 'Date is required'),
    checkIn: z.string().min(1, 'Check-in time is required'),
    checkOut: z.string().optional(),
    totalHours: z.number().min(0).max(24),
    status: z.enum(['Pending', 'Approved', 'Rejected']).default('Pending'),
    notes: z.string().optional(),
});

export const createTimesheetSchema = timesheetSchema.omit({ id: true });
export const updateTimesheetSchema = timesheetSchema.partial().required({ id: true });

// Payroll Schema
export const payrollSchema = z.object({
    id: z.string().optional(),
    employeeId: z.string().min(1, 'Employee is required'),
    period: z.string().min(1, 'Period is required'),
    baseSalary: z.number().min(0, 'Base salary must be positive'),
    deductions: z.number().min(0, 'Deductions must be positive').default(0),
    bonuses: z.number().min(0, 'Bonuses must be positive').default(0),
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
