import client from './client';

// ---- Types ----

export interface AttendanceSummary {
    totalEmployees: number;
    avgAttendanceRate: number;
    avgPunctualityRate: number;
    totalOTHours: number;
    employees: {
        employeeId: string;
        name: string;
        department: string;
        attendanceRate: number;
        punctualityRate: number;
        totalOTHours: number;
        present: number;
        late: number;
        absent: number;
    }[];
}

export interface EmployeePerformance {
    employeeId: string;
    name: string;
    department: string;
    position: string;
    baseSalary: number;
    performanceBonus: number;
    attendanceBonus: number;
    overtimePay: number;
    totalBonuses: number;
    netPay: number;
    rank: number;
}

export interface LeaveSummary {
    totalLeaveDays: number;
    utilizationRate: number;
    byType: { type: string; totalDays: number; count: number }[];
    byDepartment: { department: string; totalDays: number; count: number }[];
}

export interface TimesheetOverview {
    totalActualHours: number;
    totalPlannedHours: number;
    totalOTHours: number;
    efficiencyPercent: number;
    employees: {
        employeeId: string;
        name: string;
        department: string;
        actualHours: number;
        overtimeHours: number;
        plannedHours: number;
        efficiency: number;
    }[];
}

export interface PayrollSummary {
    month: number;
    year: number;
    totalGrossSalary: number;
    totalNetSalary: number;
    totalBonuses: number;
    totalDeductions: number;
    totalInsurance: number;
    employeeCount: number;
    avgNetSalary: number;
    byDepartment: {
        department: string;
        employeeCount: number;
        totalGross: number;
        totalNet: number;
        avgNet: number;
    }[];
}

export interface EmployeeRanking {
    rank: number;
    id: string;
    fullName: string;
    department: string;
    position: string;
    attendanceScore: number;
    performanceScore: number;
    punctualityScore: number;
    leaveScore: number;
    compositeScore: number;
}

// ---- API ----

export const hrReportsApi = {
    getAttendanceSummary: async (startDate?: string, endDate?: string, departmentId?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (departmentId) params.append('departmentId', departmentId);
        const { data } = await client.get<AttendanceSummary>(`/reports/hr/attendance-summary?${params}`);
        return data;
    },

    getEmployeePerformance: async (startDate?: string, endDate?: string, top = 20) => {
        const params = new URLSearchParams({ top: top.toString() });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const { data } = await client.get<EmployeePerformance[]>(`/reports/hr/employee-performance?${params}`);
        return data;
    },

    getLeaveSummary: async (year?: number, departmentId?: string) => {
        const params = new URLSearchParams();
        if (year) params.append('year', year.toString());
        if (departmentId) params.append('departmentId', departmentId);
        const { data } = await client.get<LeaveSummary>(`/reports/hr/leave-summary?${params}`);
        return data;
    },

    getTimesheetOverview: async (month?: number, year?: number, departmentId?: string) => {
        const params = new URLSearchParams();
        if (month) params.append('month', month.toString());
        if (year) params.append('year', year.toString());
        if (departmentId) params.append('departmentId', departmentId);
        const { data } = await client.get<TimesheetOverview>(`/reports/hr/timesheet-overview?${params}`);
        return data;
    },

    getPayrollSummary: async (month?: number, year?: number) => {
        const params = new URLSearchParams();
        if (month) params.append('month', month.toString());
        if (year) params.append('year', year.toString());
        const { data } = await client.get<PayrollSummary>(`/reports/hr/payroll-summary?${params}`);
        return data;
    },

    getEmployeeRanking: async (startDate?: string, endDate?: string, top = 20) => {
        const params = new URLSearchParams({ top: top.toString() });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const { data } = await client.get<EmployeeRanking[]>(`/reports/hr/employee-ranking?${params}`);
        return data;
    },
};
