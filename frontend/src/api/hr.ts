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
        const response = await client.get<any>(`/hr/employees/${id}`);
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

    // Timesheet APIs - NOTE: Backend only has POST and GET by employee
    getTimesheets: async (_page: number = 1, _pageSize: number = 15, _params?: any) => {
        throw new Error('Get timesheets list endpoint not implemented in backend');
    },
    getTimesheet: async (_id: string) => {
        throw new Error('Get timesheet by ID endpoint not implemented in backend');
    },
    createTimesheet: async (data: Partial<Timesheet>) => {
        const response = await client.post<Timesheet>('/hr/timesheets', data);
        return response.data;
    },
    updateTimesheet: async (_id: string, _data: Partial<Timesheet>) => {
        throw new Error('Update timesheet endpoint not implemented in backend');
    },
    approveTimesheet: async (_id: string) => {
        throw new Error('Approve timesheet endpoint not implemented in backend');
    },
    rejectTimesheet: async (_id: string, _reason?: string) => {
        throw new Error('Reject timesheet endpoint not implemented in backend');
    },
    // Backend only has GET /hr/employees/{id}/timesheets
    getEmployeeTimesheets: async (employeeId: string, month: number, year: number) => {
        const response = await client.get<any[]>(`/hr/employees/${employeeId}/timesheets`, {
            params: { month, year }
        });
        return response.data;
    },

    // Payroll APIs - NOTE: Backend has different endpoints
    getPayrolls: async (month: number, year: number) => {
        const response = await client.get<any[]>('/hr/payroll', {
            params: { month, year }
        });
        return response.data;
    },
    getPayroll: async (_id: string) => {
        throw new Error('Get payroll by ID endpoint not implemented in backend');
    },
    createPayroll: async (_data: Partial<Payroll>) => {
        throw new Error('Create payroll endpoint not implemented in backend - use generatePayroll');
    },
    updatePayroll: async (_id: string, _data: Partial<Payroll>) => {
        throw new Error('Update payroll endpoint not implemented in backend');
    },
    processPayroll: async (_id: string) => {
        throw new Error('Process payroll endpoint not implemented in backend - use generatePayroll');
    },
    generatePayroll: async (month: number, year: number) => {
        const response = await client.post<any>('/hr/payroll/generate', null, {
            params: { month, year }
        });
        return response.data;
    },
    markPayrollPaid: async (id: string) => {
        const response = await client.put<any>(`/hr/payroll/${id}/pay`);
        return response.data;
    }
};
