import client from './client';

// ============================================
// HR API Types
// ============================================

export type EmployeeStatus = 'Active' | 'Inactive' | 'OnLeave' | 'OnProbation' | 'Resigned' | 'Terminated';
export type TimesheetStatus = 'Pending' | 'Approved' | 'Rejected';
export type PayrollStatus = 'Draft' | 'Calculated' | 'Approved' | 'Processed' | 'Paid';
export type JobStatus = 'Draft' | 'Active' | 'Closed' | 'Archived';

export interface Employee {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    department: string;
    position: string;
    baseSalary: number;
    hireDate: string;
    status: EmployeeStatus;
    // Additional fields from backend
    employeeCode?: string;
    idCardNumber?: string;
    address?: string;
    terminationDate?: string;
    terminationReason?: string;
    probationEndDate?: string;
    bankAccount?: string;
    bankName?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    avatarUrl?: string;
    skills?: string; // JSON array
    certifications?: string; // JSON array
    hourlyRate?: number;
    reportingToId?: string;
    userId?: string;
    dateOfBirth?: string;
    gender?: string;
    taxCode?: string;
    socialInsuranceNumber?: string;
    workLocation?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateEmployeeDto {
    fullName: string;
    email: string;
    phone?: string;
    department: string;
    position: string;
    baseSalary: number;
    hireDate?: string;
    idCardNumber?: string;
    address?: string;
}

export interface UpdateEmployeeDto {
    fullName: string;
    email: string;
    phone?: string;
    department: string;
    position: string;
    baseSalary?: number;
    idCardNumber?: string;
    address?: string;
    isActive?: boolean;
}

export interface Timesheet {
    id: string;
    employeeId: string;
    employeeName?: string;
    date: string;
    checkIn: string;
    checkOut?: string;
    totalHours: number;
    regularHours?: number;
    overtimeHours?: number;
    status: TimesheetStatus;
    notes?: string;
    rejectionReason?: string;
    approvedBy?: string;
    approvedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateTimesheetDto {
    employeeId: string;
    date: string;
    checkIn: string;
    checkOut?: string;
    notes?: string;
}

export interface UpdateTimesheetDto {
    checkIn?: string;
    checkOut?: string;
    notes?: string;
}

export interface Payroll {
    id: string;
    employeeId: string;
    employeeName?: string;
    month: number;
    year: number;
    baseSalary: number;
    deductions: number;
    bonuses: number;
    netPay: number;
    status: PayrollStatus;
    regularHours?: number;
    overtimeHours?: number;
    overtimePay?: number;
    taxDeduction?: number;
    insuranceDeduction?: number;
    otherDeductions?: number;
    performanceBonus?: number;
    attendanceBonus?: number;
    calculatedAt?: string;
    approvedAt?: string;
    processedAt?: string;
    paidAt?: string;
    approvedBy?: string;
    processedBy?: string;
    notes?: string;
}

export interface JobListing {
    id: string;
    title: string;
    description: string;
    requirements: string;
    benefits: string;
    department: string;
    location: string;
    jobType: string;
    salaryRangeMin?: number;
    salaryRangeMax?: number;
    expiryDate: string;
    status: JobStatus;
    createdAt: string;
    updatedAt?: string;
}

export interface EmployeesResponse {
    items: Employee[];
    total: number;
    page: number;
    pageSize: number;
}

export interface TimesheetsResponse {
    total: number;
    page: number;
    pageSize: number;
    timesheets: Timesheet[];
}

export interface PayrollsResponse {
    items: Payroll[];
    total: number;
    page: number;
    pageSize: number;
}

export interface TimesheetQueryParams {
    page?: number;
    pageSize?: number;
    employeeId?: string;
    month?: number;
    year?: number;
    status?: TimesheetStatus;
}

// ============================================
// Internal API Functions (no circular refs)
// ============================================

// --- Employee APIs ---
const _getEmployees = async (page: number = 1, pageSize: number = 15, params?: Record<string, any>): Promise<EmployeesResponse> => {
    const response = await client.get<EmployeesResponse>('/hr/employees', {
        params: { page, pageSize, ...params }
    });
    if (Array.isArray(response.data)) {
        return { items: response.data, total: response.data.length, page: 1, pageSize: response.data.length };
    }
    return response.data;
};

const _getEmployee = async (id: string): Promise<Employee> => {
    const response = await client.get<Employee>(`/hr/employees/${id}`);
    return response.data;
};

const _createEmployee = async (data: Partial<Employee>): Promise<Employee> => {
    const response = await client.post<Employee>('/hr/employees', data);
    return response.data;
};

const _updateEmployee = async (id: string, data: Partial<Employee>): Promise<Employee> => {
    const response = await client.put<Employee>(`/hr/employees/${id}`, data);
    return response.data;
};

const _deleteEmployee = async (id: string): Promise<{ message: string }> => {
    const response = await client.delete(`/hr/employees/${id}`);
    return response.data;
};

// --- Timesheet APIs ---
const _getTimesheets = async (params: TimesheetQueryParams = {}): Promise<TimesheetsResponse> => {
    const queryParams: Record<string, any> = {};
    if (params.page) queryParams.page = params.page;
    if (params.pageSize) queryParams.pageSize = params.pageSize;
    if (params.employeeId) queryParams.employeeId = params.employeeId;
    if (params.month) queryParams.month = params.month;
    if (params.year) queryParams.year = params.year;
    if (params.status) queryParams.status = params.status;
    const response = await client.get<TimesheetsResponse>('/hr/timesheets', { params: queryParams });
    return response.data;
};

const _getTimesheet = async (id: string): Promise<Timesheet> => {
    const response = await client.get<Timesheet>(`/hr/timesheets/${id}`);
    return response.data;
};

const _createTimesheet = async (data: CreateTimesheetDto): Promise<Timesheet> => {
    const response = await client.post<Timesheet>('/hr/timesheets', data);
    return response.data;
};

const _updateTimesheet = async (id: string, data: UpdateTimesheetDto): Promise<{ message: string; timesheet: Timesheet }> => {
    const response = await client.put(`/hr/timesheets/${id}`, data);
    return response.data;
};

const _approveTimesheet = async (id: string, notes?: string): Promise<{ message: string; status: string; approvedAt: string }> => {
    const response = await client.post(`/hr/timesheets/${id}/approve`, { notes });
    return response.data;
};

const _rejectTimesheet = async (id: string, reason: string): Promise<{ message: string; status: string; rejectionReason: string }> => {
    const response = await client.post(`/hr/timesheets/${id}/reject`, { reason });
    return response.data;
};

const _getEmployeeTimesheets = async (employeeId: string, month: number, year: number): Promise<Timesheet[]> => {
    const response = await client.get<Timesheet[]>(`/hr/employees/${employeeId}/timesheets`, {
        params: { month, year }
    });
    return response.data;
};

// --- Payroll APIs ---
const _getPayrolls = async (month: number, year: number): Promise<Payroll[]> => {
    const response = await client.get<Payroll[]>('/hr/payroll', { params: { month, year } });
    return response.data;
};

const _getPayroll = async (id: string): Promise<Payroll> => {
    const response = await client.get<Payroll>(`/hr/payroll/${id}`);
    return response.data;
};

const _generatePayroll = async (month: number, year: number): Promise<{ message: string }> => {
    const response = await client.post('/hr/payroll/generate', { month, year });
    return response.data;
};

const _calculatePayroll = async (id: string): Promise<{ message: string; payrollId: string; baseSalary: number; bonuses: number; deductions: number; netPay: number; status: string }> => {
    const response = await client.post(`/hr/payroll/${id}/calculate`);
    return response.data;
};

const _approvePayroll = async (id: string): Promise<{ message: string; payrollId: string; status: string; approvedAt: string }> => {
    const response = await client.post(`/hr/payroll/${id}/approve`);
    return response.data;
};

const _processPayroll = async (id: string): Promise<{ message: string; payrollId: string; status: string; processedAt: string }> => {
    const response = await client.post(`/hr/payroll/${id}/process`);
    return response.data;
};

const _markPayrollPaid = async (id: string): Promise<{ message: string; payrollId: string }> => {
    const response = await client.put(`/hr/payroll/${id}/pay`);
    return response.data;
};

const _addPayrollBonus = async (id: string, amount: number, type: string = 'Performance'): Promise<{ message: string }> => {
    const response = await client.post(`/hr/payroll/${id}/bonus`, { amount, type });
    return response.data;
};

const _addPayrollDeduction = async (id: string, amount: number, type: string = 'Other'): Promise<{ message: string }> => {
    const response = await client.post(`/hr/payroll/${id}/deduction`, { amount, type });
    return response.data;
};

const _updatePayrollNotes = async (id: string, notes: string): Promise<{ message: string }> => {
    const response = await client.put(`/hr/payroll/${id}/notes`, { notes });
    return response.data;
};

// --- Recruitment APIs ---
const _getPublicJobListings = async (): Promise<JobListing[]> => {
    const response = await client.get<JobListing[]>('/recruitment');
    return response.data;
};

const _getPublicJobDetail = async (id: string): Promise<JobListing> => {
    const response = await client.get<JobListing>(`/recruitment/${id}`);
    return response.data;
};

const _getAdminJobListings = async (): Promise<JobListing[]> => {
    const response = await client.get<JobListing[]>('/hr/recruitment');
    return response.data;
};

const _createJobListing = async (data: Partial<JobListing>): Promise<JobListing> => {
    const response = await client.post<JobListing>('/hr/recruitment', data);
    return response.data;
};

const _updateJobListing = async (id: string, data: Partial<JobListing>): Promise<JobListing> => {
    const response = await client.put<JobListing>(`/hr/recruitment/${id}`, data);
    return response.data;
};

const _deleteJobListing = async (id: string): Promise<{ message: string }> => {
    const response = await client.delete(`/hr/recruitment/${id}`);
    return response.data;
};

// --- Leave APIs ---
const _getLeaves = async (params?: LeaveQueryParams) => {
    const response = await client.get('/hr/leaves', { params });
    return response.data;
};
const _getLeave = async (id: string) => {
    const response = await client.get(`/hr/leaves/${id}`);
    return response.data;
};
const _createLeave = async (data: CreateLeaveDto) => {
    const response = await client.post('/hr/leaves', data);
    return response.data;
};
const _approveLeave = async (id: string) => {
    const response = await client.put(`/hr/leaves/${id}/approve`);
    return response.data;
};
const _rejectLeave = async (id: string, reason: string) => {
    const response = await client.put(`/hr/leaves/${id}/reject`, { reason });
    return response.data;
};
const _cancelLeave = async (id: string) => {
    const response = await client.put(`/hr/leaves/${id}/cancel`);
    return response.data;
};
const _getLeaveSummary = async (employeeId: string, year?: number) => {
    const response = await client.get(`/hr/leaves/summary/${employeeId}`, { params: { year } });
    return response.data;
};

// --- Shift APIs ---
const _getShifts = async () => {
    const response = await client.get('/hr/shifts');
    return response.data;
};
const _createShift = async (data: CreateShiftDto) => {
    const response = await client.post('/hr/shifts', data);
    return response.data;
};
const _updateShift = async (id: string, data: UpdateShiftDto) => {
    const response = await client.put(`/hr/shifts/${id}`, data);
    return response.data;
};
const _toggleShift = async (id: string) => {
    const response = await client.put(`/hr/shifts/${id}/toggle`);
    return response.data;
};

// --- Shift Assignment APIs ---
const _getShiftAssignments = async (params?: ShiftAssignmentQueryParams) => {
    const response = await client.get('/hr/shift-assignments', { params });
    return response.data;
};
const _createShiftAssignment = async (data: CreateShiftAssignmentDto) => {
    const response = await client.post('/hr/shift-assignments', data);
    return response.data;
};
const _batchCreateShiftAssignment = async (data: BatchShiftAssignmentDto) => {
    const response = await client.post('/hr/shift-assignments/batch', data);
    return response.data;
};
const _checkInShift = async (id: string) => {
    const response = await client.put(`/hr/shift-assignments/${id}/check-in`);
    return response.data;
};
const _checkOutShift = async (id: string) => {
    const response = await client.put(`/hr/shift-assignments/${id}/check-out`);
    return response.data;
};
const _cancelShiftAssignment = async (id: string) => {
    const response = await client.put(`/hr/shift-assignments/${id}/cancel`);
    return response.data;
};

// ============================================
// Public API Export
// ============================================

export const hrApi = {
    // ========== Namespaced API (recommended) ==========
    employees: {
        getList: _getEmployees,
        getById: _getEmployee,
        create: _createEmployee,
        update: _updateEmployee,
        delete: _deleteEmployee,
    },
    timesheets: {
        getList: _getTimesheets,
        getById: _getTimesheet,
        create: _createTimesheet,
        update: _updateTimesheet,
        approve: _approveTimesheet,
        reject: _rejectTimesheet,
        getByEmployee: _getEmployeeTimesheets,
    },
    payroll: {
        getList: _getPayrolls,
        getById: _getPayroll,
        generate: _generatePayroll,
        calculate: _calculatePayroll,
        approve: _approvePayroll,
        process: _processPayroll,
        markPaid: _markPayrollPaid,
        addBonus: _addPayrollBonus,
        addDeduction: _addPayrollDeduction,
        updateNotes: _updatePayrollNotes,
    },
    recruitment: {
        getPublicListings: _getPublicJobListings,
        getPublicDetail: _getPublicJobDetail,
        getAdminListings: _getAdminJobListings,
        create: _createJobListing,
        update: _updateJobListing,
        delete: _deleteJobListing,
    },
    leaves: {
        getList: _getLeaves,
        getById: _getLeave,
        create: _createLeave,
        approve: _approveLeave,
        reject: _rejectLeave,
        cancel: _cancelLeave,
        getSummary: _getLeaveSummary,
    },
    shifts: {
        getList: _getShifts,
        create: _createShift,
        update: _updateShift,
        toggle: _toggleShift,
    },
    shiftAssignments: {
        getList: _getShiftAssignments,
        create: _createShiftAssignment,
        batchCreate: _batchCreateShiftAssignment,
        checkIn: _checkInShift,
        checkOut: _checkOutShift,
        cancel: _cancelShiftAssignment,
    },

    // ========== Flat API (backward compatible) ==========
    getEmployees: _getEmployees,
    getEmployee: _getEmployee,
    createEmployee: _createEmployee,
    updateEmployee: _updateEmployee,
    deleteEmployee: _deleteEmployee,
    getTimesheets: _getTimesheets,
    getTimesheet: _getTimesheet,
    createTimesheet: _createTimesheet,
    updateTimesheet: _updateTimesheet,
    approveTimesheet: _approveTimesheet,
    rejectTimesheet: _rejectTimesheet,
    getEmployeeTimesheets: _getEmployeeTimesheets,
    getPayrolls: _getPayrolls,
    getPayroll: _getPayroll,
    generatePayroll: _generatePayroll,
    markPayrollPaid: _markPayrollPaid,
    getPublicJobListings: _getPublicJobListings,
    getPublicJobDetail: _getPublicJobDetail,
    getAdminJobListings: _getAdminJobListings,
    createJobListing: _createJobListing,
    updateJobListing: _updateJobListing,
    deleteJobListing: _deleteJobListing,
};

// ============================================
// Helper Functions
// ============================================

export const getTimesheetStatusColor = (status: TimesheetStatus): string => {
    const colors: Record<TimesheetStatus, string> = {
        Pending: 'bg-yellow-100 text-yellow-800',
        Approved: 'bg-green-100 text-green-800',
        Rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getPayrollStatusColor = (status: PayrollStatus): string => {
    const colors: Record<PayrollStatus, string> = {
        Draft: 'bg-gray-100 text-gray-800',
        Calculated: 'bg-blue-100 text-blue-800',
        Approved: 'bg-indigo-100 text-indigo-800',
        Processed: 'bg-purple-100 text-purple-800',
        Paid: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getEmployeeStatusColor = (status: EmployeeStatus): string => {
    const colors: Record<EmployeeStatus, string> = {
        Active: 'bg-green-100 text-green-800',
        Inactive: 'bg-gray-100 text-gray-800',
        OnLeave: 'bg-orange-100 text-orange-800',
        OnProbation: 'bg-blue-100 text-blue-800',
        Resigned: 'bg-yellow-100 text-yellow-800',
        Terminated: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount);
};

export const getPayrollPeriodLabel = (month: number, year: number): string => {
    return `Tháng ${month}/${year}`;
};

// ============================================
// Phase 2.2 Types — Leave & Shift Management
// ============================================

export type LeaveType = 'Annual' | 'Sick' | 'Unpaid' | 'Personal' | 'Maternity' | 'Paternity' | 'Bereavement' | 'Compassionate' | 'Study' | 'JuryDuty';
export type LeaveRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
export type ShiftAssignmentStatus = 'Scheduled' | 'CheckedIn' | 'CheckedOut' | 'Missed' | 'Late' | 'Cancelled';

export interface LeaveRequest {
    id: string;
    employeeId: string;
    employeeName?: string;
    type: LeaveType;
    startDate: string;
    endDate: string;
    days: number;
    reason?: string;
    status: LeaveRequestStatus;
    approvedAt?: string;
    approvedBy?: string;
    rejectReason?: string;
    rejectedAt?: string;
    isPaidLeave: boolean;
    handoverTo?: string;
    handoverNotes?: string;
    contactDuringLeave?: string;
    createdAt: string;
}

export interface LeaveQueryParams {
    employeeId?: string;
    status?: string;
    type?: string;
    page?: number;
    pageSize?: number;
}

export interface CreateLeaveDto {
    employeeId: string;
    type: string;
    startDate: string;
    endDate: string;
    days: number;
    reason?: string;
    isPaidLeave?: boolean;
    handoverNotes?: string;
    handoverTo?: string;
    contactDuringLeave?: string;
}

export interface LeaveSummary {
    employeeId: string;
    year: number;
    annualLeaveUsed: number;
    sickLeaveUsed: number;
    unpaidLeaveUsed: number;
    totalDaysUsed: number;
    pendingRequests: number;
    annualLeaveTotal: number;
    sickLeaveTotal: number;
}

export interface Shift {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakDurationMinutes?: number;
    description?: string;
    colorCode?: string;
    displayOrder: number;
    isActive: boolean;
    hours: number;
}

export interface CreateShiftDto {
    name: string;
    startTime: string;
    endTime: string;
    breakDurationMinutes?: number;
    description?: string;
    colorCode?: string;
    displayOrder?: number;
}

export interface UpdateShiftDto {
    name: string;
    startTime: string;
    endTime: string;
    breakDurationMinutes?: number;
}

export interface ShiftAssignment {
    id: string;
    employeeId: string;
    employeeName?: string;
    shiftId: string;
    shiftName?: string;
    date: string;
    status: ShiftAssignmentStatus;
    actualStartTime?: string;
    actualEndTime?: string;
    actualHoursWorked?: number;
    checkInAt?: string;
    checkOutAt?: string;
    notes?: string;
}

export interface ShiftAssignmentQueryParams {
    employeeId?: string;
    shiftId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
}

export interface CreateShiftAssignmentDto {
    employeeId: string;
    shiftId: string;
    date: string;
}

export interface BatchShiftAssignmentDto {
    employeeIds: string[];
    shiftId: string;
    dates: string[];
}

// Label maps
export const leaveTypeLabels: Record<LeaveType, string> = {
    Annual: 'Nghỉ phép năm',
    Sick: 'Nghỉ ốm',
    Unpaid: 'Nghỉ không lương',
    Personal: 'Nghỉ việc riêng',
    Maternity: 'Nghỉ thai sản',
    Paternity: 'Nghỉ cha sinh',
    Bereavement: 'Nghỉ tang',
    Compassionate: 'Nghỉ có lý do',
    Study: 'Nghỉ học',
    JuryDuty: 'Nghỉ nghĩa vụ'
};

export const leaveStatusLabels: Record<LeaveRequestStatus, string> = {
    Pending: 'Chờ duyệt',
    Approved: 'Đã duyệt',
    Rejected: 'Từ chối',
    Cancelled: 'Đã hủy'
};

export const shiftAssignmentStatusLabels: Record<ShiftAssignmentStatus, string> = {
    Scheduled: 'Đã lên lịch',
    CheckedIn: 'Đã vào ca',
    CheckedOut: 'Đã tan ca',
    Missed: 'Vắng mặt',
    Late: 'Đi trễ',
    Cancelled: 'Đã hủy'
};
