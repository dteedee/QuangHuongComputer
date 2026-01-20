import client from './client';

export interface Employee {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    department: string;
    position: string;
    baseSalary: number;
    hireDate: string;
    status: 'Active' | 'Inactive' | 'OnLeave';
    address?: string;
    emergencyContact?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Timesheet {
    id: string;
    employeeId: string;
    employeeName?: string;
    date: string;
    checkIn: string;
    checkOut?: string;
    totalHours: number;
    status: 'Pending' | 'Approved' | 'Rejected';
    notes?: string;
    approvedBy?: string;
    approvedAt?: string;
}

export interface Payroll {
    id: string;
    employeeId: string;
    employeeName?: string;
    period: string;
    baseSalary: number;
    deductions: number;
    bonuses: number;
    netPay: number;
    status: 'Draft' | 'Processed' | 'Paid';
    processedAt?: string;
    paidAt?: string;
}

export interface EmployeesResponse {
    items: Employee[];
    total: number;
    page: number;
    pageSize: number;
}

export interface TimesheetsResponse {
    items: Timesheet[];
    total: number;
    page: number;
    pageSize: number;
}

export interface PayrollsResponse {
    items: Payroll[];
    total: number;
    page: number;
    pageSize: number;
}

export const hrApi = {
    // Employee APIs
    getEmployees: async (page: number = 1, pageSize: number = 15, params?: any) => {
        const response = await client.get<EmployeesResponse>('/hr/employees', {
            params: { page, pageSize, ...params }
        });
        return response.data;
    },
    getEmployee: async (id: string) => {
        const response = await client.get<Employee>(`/hr/employees/${id}`);
        return response.data;
    },
    createEmployee: async (data: Partial<Employee>) => {
        const response = await client.post<Employee>('/hr/employees', data);
        return response.data;
    },
    updateEmployee: async (id: string, data: Partial<Employee>) => {
        const response = await client.put<Employee>(`/hr/employees/${id}`, data);
        return response.data;
    },
    deleteEmployee: async (id: string) => {
        const response = await client.delete(`/hr/employees/${id}`);
        return response.data;
    },

    // Timesheet APIs
    getTimesheets: async (page: number = 1, pageSize: number = 15, params?: any) => {
        const response = await client.get<TimesheetsResponse>('/hr/timesheets', {
            params: { page, pageSize, ...params }
        });
        return response.data;
    },
    getTimesheet: async (id: string) => {
        const response = await client.get<Timesheet>(`/hr/timesheets/${id}`);
        return response.data;
    },
    createTimesheet: async (data: Partial<Timesheet>) => {
        const response = await client.post<Timesheet>('/hr/timesheets', data);
        return response.data;
    },
    updateTimesheet: async (id: string, data: Partial<Timesheet>) => {
        const response = await client.put<Timesheet>(`/hr/timesheets/${id}`, data);
        return response.data;
    },
    approveTimesheet: async (id: string) => {
        const response = await client.post<Timesheet>(`/hr/timesheets/${id}/approve`);
        return response.data;
    },
    rejectTimesheet: async (id: string, reason?: string) => {
        const response = await client.post<Timesheet>(`/hr/timesheets/${id}/reject`, { reason });
        return response.data;
    },

    // Payroll APIs
    getPayrolls: async (page: number = 1, pageSize: number = 15, params?: any) => {
        const response = await client.get<PayrollsResponse>('/hr/payroll', {
            params: { page, pageSize, ...params }
        });
        return response.data;
    },
    getPayroll: async (id: string) => {
        const response = await client.get<Payroll>(`/hr/payroll/${id}`);
        return response.data;
    },
    createPayroll: async (data: Partial<Payroll>) => {
        const response = await client.post<Payroll>('/hr/payroll', data);
        return response.data;
    },
    updatePayroll: async (id: string, data: Partial<Payroll>) => {
        const response = await client.put<Payroll>(`/hr/payroll/${id}`, data);
        return response.data;
    },
    processPayroll: async (id: string) => {
        const response = await client.post<Payroll>(`/hr/payroll/${id}/process`);
        return response.data;
    },
    generatePayroll: async (period: string) => {
        const response = await client.post<Payroll[]>('/hr/payroll/generate', { period });
        return response.data;
    }
};
