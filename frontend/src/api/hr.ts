import client from './client';

export interface Employee {
    id: string;
    fullName: string;
    email: string;
    position: string;
    baseSalary: number;
    joinedDate: string;
    isActive: boolean;
}

export interface Payroll {
    id: string;
    employeeId: string;
    employeeName?: string;
    month: number;
    year: number;
    amount: number;
    isPaid: boolean;
}

export const hrApi = {
    getEmployees: async () => {
        const response = await client.get<Employee[]>('/hr/employees');
        return response.data;
    },
    getPayroll: async () => {
        const response = await client.get<Payroll[]>('/hr/payroll');
        return response.data;
    },
    createEmployee: async (data: any) => {
        const response = await client.post('/hr/employees', data);
        return response.data;
    },
    generatePayroll: async (month: number, year: number) => {
        const response = await client.post('/hr/payroll/generate', { month, year });
        return response.data;
    }
};
