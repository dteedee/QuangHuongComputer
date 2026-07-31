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

// --- Attendance APIs ---
const _checkIn = async () => {
    const { data } = await client.post('/api/hr/attendance/check-in');
    return data;
};

const _checkOut = async () => {
    const { data } = await client.post('/api/hr/attendance/check-out');
    return data;
};

const _getAttendanceToday = async () => {
    const { data } = await client.get('/api/hr/attendance/today');
    return data;
};

const _getAttendanceReport = async (month: string) => {
    const { data } = await client.get('/api/hr/attendance/report', { params: { month } });
    return data;
};

const _getMyAttendanceReport = async (month: string) => {
    const { data } = await client.get('/api/hr/attendance/my-report', { params: { month } });
    return data;
};

// --- Approval APIs ---
const _getPendingApprovals = async () => {
    const { data } = await client.get('/api/hr/approvals/pending');
    return data;
};

const _getMyApprovalRequests = async () => {
    const { data } = await client.get('/api/hr/approvals/my-requests');
    return data;
};

const _approveRequest = async (id: string, comments?: string) => {
    const { data } = await client.post(`/api/hr/approvals/${id}/approve`, { comments });
    return data;
};

const _rejectRequest = async (id: string, reason: string) => {
    const { data } = await client.post(`/api/hr/approvals/${id}/reject`, { reason });
    return data;
};

// --- Self-service APIs ---
const _getMyProfile = async () => {
    const { data } = await client.get('/api/hr/self-service/profile');
    return data;
};

const _updateMyProfile = async (profile: any) => {
    const { data } = await client.put('/api/hr/self-service/profile', profile);
    return data;
};

const _getLeaveBalance = async () => {
    const { data } = await client.get('/api/hr/self-service/leave-balance');
    return data;
};

const _getMyPayslips = async () => {
    const { data } = await client.get('/api/hr/self-service/payslips');
    return data;
};

const _getHolidays = async (year: number) => {
    const { data } = await client.get('/api/hr/self-service/holidays', { params: { year } });
    return data;
};

// Named exports for direct import
export const checkIn = _checkIn;
export const checkOut = _checkOut;
export const getAttendanceToday = _getAttendanceToday;
export const getAttendanceReport = _getAttendanceReport;
export const getMyAttendanceReport = _getMyAttendanceReport;
export const getPendingApprovals = _getPendingApprovals;
export const getMyApprovalRequests = _getMyApprovalRequests;
export const approveRequest = _approveRequest;
export const rejectRequest = _rejectRequest;
export const getMyProfile = _getMyProfile;
export const updateMyProfile = _updateMyProfile;
export const getLeaveBalance = _getLeaveBalance;
export const getMyPayslips = _getMyPayslips;
export const getHolidays = _getHolidays;

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

// ============================================
// Phase 06 (Luồng D) — Payroll / Contract / Salary / Asset / PIT / AttendanceRule
// ============================================

export type PayrollRunStatus = 'Draft' | 'Calculating' | 'Calculated' | 'Approved' | 'Paid' | 'Cancelled';
export type PayrollLineType =
    | 'BaseSalary' | 'OvertimeWeekday' | 'OvertimeSunday' | 'OvertimeHoliday' | 'OvertimeNight'
    | 'AllowanceTaxable' | 'AllowanceNonTaxable' | 'Bonus' | 'Advance'
    | 'InsuranceSocial' | 'InsuranceHealth' | 'InsuranceUnemployment'
    | 'PersonalIncomeTax' | 'LateFine' | 'OtherDeduction'
    | 'DependentDeduction' | 'SelfDeduction';

export type ContractType = 'Probation' | 'FixedTerm1Year' | 'FixedTerm3Year' | 'Permanent' | 'Seasonal' | 'Internship';
export type ContractStatus = 'Draft' | 'Active' | 'Expired' | 'Terminated' | 'Renewed';
export type DependentRelation = 'Child' | 'Spouse' | 'Parent' | 'Grandparent' | 'Sibling' | 'Other';
export type AssetType = 'Laptop' | 'Desktop' | 'Phone' | 'Monitor' | 'Uniform' | 'Vehicle' | 'Other';
export type AssetCondition = 'New' | 'Good' | 'Fair' | 'Damaged' | 'Lost';

export interface PayrollRun {
    id: string;
    periodMonth: number;
    periodYear: number;
    status: PayrollRunStatus;
    employeeCount: number;
    totalGross: number;
    totalNet: number;
    totalTax: number;
    totalInsurance: number;
    storeId?: string;
    storeName?: string;
    createdAt: string;
    calculatedAt?: string;
    approvedAt?: string;
    approvedBy?: string;
    paidAt?: string;
    paidBy?: string;
    notes?: string;
}

export interface PayrollRunDetail extends PayrollRun {
    payrolls: Payroll[];
}

export interface PayrollLineItem {
    id: string;
    payrollId: string;
    type: PayrollLineType;
    label: string;
    amount: number;
    isTaxable?: boolean;
    quantity?: number;
    rate?: number;
    notes?: string;
}

export interface PayrollDetail extends Payroll {
    lineItems: PayrollLineItem[];
    payrollRunId?: string;
    grossPay?: number;
    workdaysStandard?: number;
    workdaysActual?: number;
    lateMinutes?: number;
    dependentCount?: number;
    salaryStructureId?: string;
    bankTransferRef?: string;
    employeeCode?: string;
    employeeBankAccount?: string;
    employeeBankName?: string;
}

export interface CreatePayrollRunDto {
    periodMonth: number;
    periodYear: number;
    storeId?: string;
    employeeIds?: string[];
    notes?: string;
}

export interface BankTransferRow {
    employeeCode: string;
    employeeName: string;
    bankAccount: string;
    bankName: string;
    amount: number;
    description: string;
}

export interface EmploymentContract {
    id: string;
    employeeId: string;
    employeeName?: string;
    contractNumber: string;
    type: ContractType;
    startDate: string;
    endDate?: string;
    contractSalary: number;
    insurableSalary: number;
    status: ContractStatus;
    documentUrl?: string;
    signedAt?: string;
    terminatedAt?: string;
    terminationReason?: string;
    createdAt?: string;
}

export interface CreateContractDto {
    employeeId: string;
    contractNumber?: string;
    type: ContractType;
    startDate: string;
    endDate?: string;
    contractSalary: number;
    insurableSalary: number;
    documentUrl?: string;
}

export interface Dependent {
    id: string;
    employeeId: string;
    fullName: string;
    relation: DependentRelation;
    birthDate: string;
    taxCode?: string;
    deductionStartDate: string;
    deductionEndDate?: string;
    createdAt?: string;
}

export interface CreateDependentDto {
    fullName: string;
    relation: DependentRelation;
    birthDate: string;
    taxCode?: string;
    deductionStartDate: string;
    deductionEndDate?: string;
}

export interface SalaryStructure {
    id: string;
    employeeId: string;
    baseSalary: number;
    insurableSalary: number;
    coefficient: number;
    effectiveDate: string;
    endDate?: string;
    note?: string;
    createdAt?: string;
}

export interface CreateSalaryStructureDto {
    baseSalary: number;
    insurableSalary: number;
    coefficient?: number;
    effectiveDate: string;
    endDate?: string;
    note?: string;
}

export interface AllowanceType {
    id: string;
    code: string;
    name: string;
    taxFreeMonthlyCap?: number;
    taxFreeYearlyCap?: number;
    isTaxable: boolean;
}

export interface Allowance {
    id: string;
    employeeId: string;
    allowanceTypeId: string;
    allowanceTypeName?: string;
    amount: number;
    effectiveDate: string;
    endDate?: string;
    isTaxable: boolean;
}

export interface CreateAllowanceDto {
    allowanceTypeId: string;
    amount: number;
    effectiveDate: string;
    endDate?: string;
}

export interface EmployeeAsset {
    id: string;
    employeeId: string;
    employeeName?: string;
    type: AssetType;
    code: string;
    serialNumber?: string;
    name: string;
    value: number;
    condition: AssetCondition;
    assignedDate: string;
    returnedDate?: string;
    returnCondition?: AssetCondition;
    notes?: string;
    createdAt?: string;
}

export interface CreateAssetDto {
    type: AssetType;
    code: string;
    serialNumber?: string;
    name: string;
    value: number;
    condition: AssetCondition;
    assignedDate: string;
    notes?: string;
}

export interface ReturnAssetDto {
    returnCondition: AssetCondition;
    returnedDate: string;
    notes?: string;
}

export interface AttendanceRule {
    id: string;
    storeId?: string;
    storeName?: string;
    lateToleranceMinutes: number;
    lateFineMoneyPerMinute: number;
    earlyLeaveFineMoneyPerMinute: number;
    otRateWeekday: number;
    otRateSunday: number;
    otRateHoliday: number;
    otRateNight: number;
    halfDayThresholdMinutes: number;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateAttendanceRuleDto {
    storeId?: string;
    lateToleranceMinutes: number;
    lateFineMoneyPerMinute: number;
    earlyLeaveFineMoneyPerMinute: number;
    otRateWeekday: number;
    otRateSunday: number;
    otRateHoliday: number;
    otRateNight: number;
    halfDayThresholdMinutes: number;
    active: boolean;
}

export interface PitMonthlyBreakdown {
    month: number;
    grossIncome: number;
    taxableIncome: number;
    withheldPit: number;
    insurance: number;
    dependentDeduction: number;
}

export interface PitFinalizationResult {
    employeeId: string;
    employeeName?: string;
    employeeCode?: string;
    year: number;
    totalIncome: number;
    totalWithheld: number;
    totalTaxable: number;
    totalDue: number;
    overpaymentOrShortfall: number;
    dependentCount: number;
    monthlyBreakdown: PitMonthlyBreakdown[];
    isFinalized?: boolean;
    finalizedAt?: string;
}

export interface PitFinalizationSummary {
    year: number;
    items: PitFinalizationResult[];
    totalIncome: number;
    totalWithheld: number;
    totalDue: number;
}

export interface ExpiringContract {
    id: string;
    employeeId: string;
    employeeName: string;
    contractNumber: string;
    type: ContractType;
    endDate: string;
    daysLeft: number;
}

// ── Payroll Run API ──
const _createPayrollRun = async (data: CreatePayrollRunDto): Promise<PayrollRun> => {
    const { data: res } = await client.post<PayrollRun>('/hr/payroll/runs', data);
    return res;
};

const _calculatePayrollRun = async (runId: string): Promise<PayrollRun> => {
    const { data } = await client.post<PayrollRun>(`/hr/payroll/runs/${runId}/calculate`);
    return data;
};

const _listPayrollRuns = async (params?: { year?: number; month?: number; storeId?: string }): Promise<PayrollRun[]> => {
    const { data } = await client.get<PayrollRun[] | { items: PayrollRun[] }>('/hr/payroll/runs', { params });
    return Array.isArray(data) ? data : data.items ?? [];
};

const _getPayrollRun = async (runId: string): Promise<PayrollRunDetail> => {
    const { data } = await client.get<PayrollRunDetail>(`/hr/payroll/runs/${runId}`);
    return data;
};

const _approvePayrollRun = async (runId: string): Promise<PayrollRun> => {
    const { data } = await client.post<PayrollRun>(`/hr/payroll/runs/${runId}/approve`);
    return data;
};

const _markPayrollRunPaid = async (runId: string): Promise<PayrollRun> => {
    const { data } = await client.post<PayrollRun>(`/hr/payroll/runs/${runId}/mark-paid`);
    return data;
};

const _getPayrollDetail = async (payrollId: string): Promise<PayrollDetail> => {
    const { data } = await client.get<PayrollDetail>(`/hr/payroll/${payrollId}`);
    return data;
};

const _recalculatePayroll = async (payrollId: string): Promise<PayrollDetail> => {
    const { data } = await client.post<PayrollDetail>(`/hr/payroll/${payrollId}/recalculate`);
    return data;
};

const _downloadBankTransferFile = async (runId: string): Promise<Blob> => {
    const { data } = await client.get(`/hr/payroll/runs/${runId}/bank-transfer-file`, { responseType: 'blob' });
    return data as Blob;
};

// ── Contracts API ──
const _listContracts = async (params?: { status?: ContractStatus; type?: ContractType; employeeId?: string }): Promise<EmploymentContract[]> => {
    const { data } = await client.get<EmploymentContract[]>('/hr/contracts', { params });
    return Array.isArray(data) ? data : [];
};

const _getContract = async (id: string): Promise<EmploymentContract> => {
    const { data } = await client.get<EmploymentContract>(`/hr/contracts/${id}`);
    return data;
};

const _createContract = async (payload: CreateContractDto): Promise<EmploymentContract> => {
    const { data } = await client.post<EmploymentContract>('/hr/contracts', payload);
    return data;
};

const _updateContract = async (id: string, payload: Partial<CreateContractDto>): Promise<EmploymentContract> => {
    const { data } = await client.put<EmploymentContract>(`/hr/contracts/${id}`, payload);
    return data;
};

const _terminateContract = async (id: string, reason: string): Promise<EmploymentContract> => {
    const { data } = await client.post<EmploymentContract>(`/hr/contracts/${id}/terminate`, { reason });
    return data;
};

const _renewContract = async (id: string, payload: { newEndDate: string; newSalary?: number }): Promise<EmploymentContract> => {
    const { data } = await client.post<EmploymentContract>(`/hr/contracts/${id}/renew`, payload);
    return data;
};

const _getExpiringContracts = async (days: number = 30): Promise<ExpiringContract[]> => {
    const { data } = await client.get<ExpiringContract[]>('/hr/contracts/expiring', { params: { days } });
    return Array.isArray(data) ? data : [];
};

// ── Dependents API ──
const _listDependents = async (employeeId: string): Promise<Dependent[]> => {
    const { data } = await client.get<Dependent[]>(`/hr/employees/${employeeId}/dependents`);
    return Array.isArray(data) ? data : [];
};

const _createDependent = async (employeeId: string, payload: CreateDependentDto): Promise<Dependent> => {
    const { data } = await client.post<Dependent>(`/hr/employees/${employeeId}/dependents`, payload);
    return data;
};

const _updateDependent = async (employeeId: string, depId: string, payload: Partial<CreateDependentDto>): Promise<Dependent> => {
    const { data } = await client.put<Dependent>(`/hr/employees/${employeeId}/dependents/${depId}`, payload);
    return data;
};

const _deleteDependent = async (employeeId: string, depId: string): Promise<void> => {
    await client.delete(`/hr/employees/${employeeId}/dependents/${depId}`);
};

// ── Salary Structure API ──
const _listSalaryStructures = async (employeeId: string): Promise<SalaryStructure[]> => {
    const { data } = await client.get<SalaryStructure[]>(`/hr/employees/${employeeId}/salary-structures`);
    return Array.isArray(data) ? data : [];
};

const _createSalaryStructure = async (employeeId: string, payload: CreateSalaryStructureDto): Promise<SalaryStructure> => {
    const { data } = await client.post<SalaryStructure>(`/hr/employees/${employeeId}/salary-structures`, payload);
    return data;
};

const _updateSalaryStructure = async (employeeId: string, sid: string, payload: Partial<CreateSalaryStructureDto>): Promise<SalaryStructure> => {
    const { data } = await client.put<SalaryStructure>(`/hr/employees/${employeeId}/salary-structures/${sid}`, payload);
    return data;
};

const _deleteSalaryStructure = async (employeeId: string, sid: string): Promise<void> => {
    await client.delete(`/hr/employees/${employeeId}/salary-structures/${sid}`);
};

// ── Allowances API ──
const _listAllowanceTypes = async (): Promise<AllowanceType[]> => {
    const { data } = await client.get<AllowanceType[]>('/hr/allowance-types');
    return Array.isArray(data) ? data : [];
};

const _listAllowances = async (employeeId: string): Promise<Allowance[]> => {
    const { data } = await client.get<Allowance[]>(`/hr/employees/${employeeId}/allowances`);
    return Array.isArray(data) ? data : [];
};

const _createAllowance = async (employeeId: string, payload: CreateAllowanceDto): Promise<Allowance> => {
    const { data } = await client.post<Allowance>(`/hr/employees/${employeeId}/allowances`, payload);
    return data;
};

// ── Employee Assets API ──
const _listAssets = async (employeeId?: string): Promise<EmployeeAsset[]> => {
    const url = employeeId ? `/hr/employees/${employeeId}/assets` : '/hr/employee-assets';
    const { data } = await client.get<EmployeeAsset[]>(url);
    return Array.isArray(data) ? data : [];
};

const _assignAsset = async (employeeId: string, payload: CreateAssetDto): Promise<EmployeeAsset> => {
    const { data } = await client.post<EmployeeAsset>(`/hr/employees/${employeeId}/assets`, payload);
    return data;
};

const _returnAsset = async (employeeId: string, assetId: string, payload: ReturnAssetDto): Promise<EmployeeAsset> => {
    const { data } = await client.post<EmployeeAsset>(`/hr/employees/${employeeId}/assets/${assetId}/return`, payload);
    return data;
};

// ── Attendance Rules API ──
const _listAttendanceRules = async (): Promise<AttendanceRule[]> => {
    const { data } = await client.get<AttendanceRule[]>('/hr/attendance-rules');
    return Array.isArray(data) ? data : [];
};

const _createAttendanceRule = async (payload: CreateAttendanceRuleDto): Promise<AttendanceRule> => {
    const { data } = await client.post<AttendanceRule>('/hr/attendance-rules', payload);
    return data;
};

const _updateAttendanceRule = async (id: string, payload: Partial<CreateAttendanceRuleDto>): Promise<AttendanceRule> => {
    const { data } = await client.put<AttendanceRule>(`/hr/attendance-rules/${id}`, payload);
    return data;
};

// ── PIT Finalization API ──
const _getPitFinalization = async (employeeId: string, year: number): Promise<PitFinalizationResult> => {
    const { data } = await client.get<PitFinalizationResult>(`/hr/tax/pit-finalization/${employeeId}`, { params: { year } });
    return data;
};

const _getPitFinalizationSummary = async (year: number): Promise<PitFinalizationSummary> => {
    const { data } = await client.get<PitFinalizationSummary>('/hr/tax/pit-finalization/summary', { params: { year } });
    return data;
};

const _exportPitFinalization = async (employeeId: string, year: number): Promise<Blob> => {
    const { data } = await client.post(`/hr/tax/pit-finalization/${employeeId}/export`, null, { params: { year }, responseType: 'blob' });
    return data as Blob;
};

// ── Public exports (Phase 06 D) ──
export const payrollRunsApi = {
    create: _createPayrollRun,
    calculate: _calculatePayrollRun,
    list: _listPayrollRuns,
    get: _getPayrollRun,
    approve: _approvePayrollRun,
    markPaid: _markPayrollRunPaid,
    getPayrollDetail: _getPayrollDetail,
    recalculatePayroll: _recalculatePayroll,
    downloadBankTransferFile: _downloadBankTransferFile,
};

export const contractsApi = {
    list: _listContracts,
    get: _getContract,
    create: _createContract,
    update: _updateContract,
    terminate: _terminateContract,
    renew: _renewContract,
    expiring: _getExpiringContracts,
};

export const dependentsApi = {
    list: _listDependents,
    create: _createDependent,
    update: _updateDependent,
    remove: _deleteDependent,
};

export const salaryStructureApi = {
    list: _listSalaryStructures,
    create: _createSalaryStructure,
    update: _updateSalaryStructure,
    remove: _deleteSalaryStructure,
};

export const allowancesApi = {
    listTypes: _listAllowanceTypes,
    listForEmployee: _listAllowances,
    create: _createAllowance,
};

export const employeeAssetsApi = {
    list: _listAssets,
    assign: _assignAsset,
    return: _returnAsset,
};

export const attendanceRulesApi = {
    list: _listAttendanceRules,
    create: _createAttendanceRule,
    update: _updateAttendanceRule,
};

export const pitFinalizationApi = {
    getForEmployee: _getPitFinalization,
    getSummary: _getPitFinalizationSummary,
    export: _exportPitFinalization,
};

// ── Labels & helpers for Phase 06 D ──
export const contractTypeLabels: Record<ContractType, string> = {
    Probation: 'Thử việc',
    FixedTerm1Year: 'Xác định 1 năm',
    FixedTerm3Year: 'Xác định 3 năm',
    Permanent: 'Không xác định thời hạn',
    Seasonal: 'Thời vụ',
    Internship: 'Thực tập',
};

export const contractStatusLabels: Record<ContractStatus, string> = {
    Draft: 'Nháp',
    Active: 'Đang hiệu lực',
    Expired: 'Hết hạn',
    Terminated: 'Đã chấm dứt',
    Renewed: 'Đã gia hạn',
};

export const dependentRelationLabels: Record<DependentRelation, string> = {
    Child: 'Con',
    Spouse: 'Vợ/Chồng',
    Parent: 'Cha/Mẹ',
    Grandparent: 'Ông/Bà',
    Sibling: 'Anh/Chị/Em',
    Other: 'Khác',
};

export const payrollRunStatusLabels: Record<PayrollRunStatus, string> = {
    Draft: 'Nháp',
    Calculating: 'Đang tính',
    Calculated: 'Đã tính',
    Approved: 'Đã duyệt',
    Paid: 'Đã chi trả',
    Cancelled: 'Đã hủy',
};

export const payrollRunStatusColors: Record<PayrollRunStatus, string> = {
    Draft: 'bg-gray-100 text-gray-700',
    Calculating: 'bg-blue-100 text-blue-700',
    Calculated: 'bg-indigo-100 text-indigo-700',
    Approved: 'bg-emerald-100 text-emerald-700',
    Paid: 'bg-green-600 text-white',
    Cancelled: 'bg-red-100 text-red-700',
};

export const assetTypeLabels: Record<AssetType, string> = {
    Laptop: 'Laptop',
    Desktop: 'PC/Desktop',
    Phone: 'Điện thoại',
    Monitor: 'Màn hình',
    Uniform: 'Đồng phục',
    Vehicle: 'Phương tiện',
    Other: 'Khác',
};

export const assetConditionLabels: Record<AssetCondition, string> = {
    New: 'Mới',
    Good: 'Tốt',
    Fair: 'Bình thường',
    Damaged: 'Hư hỏng',
    Lost: 'Mất',
};

export const payrollLineTypeLabels: Record<PayrollLineType, string> = {
    BaseSalary: 'Lương cơ bản (theo công)',
    OvertimeWeekday: 'OT ngày thường (150%)',
    OvertimeSunday: 'OT chủ nhật (200%)',
    OvertimeHoliday: 'OT ngày lễ (300%)',
    OvertimeNight: 'OT ban đêm (+30%)',
    AllowanceTaxable: 'Phụ cấp chịu thuế',
    AllowanceNonTaxable: 'Phụ cấp miễn thuế',
    Bonus: 'Thưởng',
    Advance: 'Tạm ứng',
    InsuranceSocial: 'BHXH (8%)',
    InsuranceHealth: 'BHYT (1.5%)',
    InsuranceUnemployment: 'BHTN (1%)',
    PersonalIncomeTax: 'Thuế TNCN',
    LateFine: 'Phạt đi muộn',
    OtherDeduction: 'Khấu trừ khác',
    DependentDeduction: 'Giảm trừ người phụ thuộc',
    SelfDeduction: 'Giảm trừ bản thân',
};

export const PAYROLL_INCOME_TYPES: PayrollLineType[] = [
    'BaseSalary', 'OvertimeWeekday', 'OvertimeSunday', 'OvertimeHoliday', 'OvertimeNight',
    'AllowanceTaxable', 'AllowanceNonTaxable', 'Bonus',
];

export const PAYROLL_DEDUCTION_TYPES: PayrollLineType[] = [
    'InsuranceSocial', 'InsuranceHealth', 'InsuranceUnemployment',
    'PersonalIncomeTax', 'LateFine', 'Advance', 'OtherDeduction',
];

// ============================================
// Phase 06 — Attendance / Overtime / Payroll self-service
// ============================================

export type CheckInMethod = 'GPS' | 'QR' | 'WiFi' | 'Manual' | 'Web';
export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'HalfDay' | 'Holiday' | 'OnLeave' | 'Weekend';
export type OvertimeRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface CheckInRequest {
    method: CheckInMethod;
    latitude?: number;
    longitude?: number;
    deviceId?: string;
    storeId?: string;
    qrCode?: string;
}

export interface CheckOutRequest {
    method?: CheckInMethod;
    latitude?: number;
    longitude?: number;
    deviceId?: string;
    storeId?: string;
    qrCode?: string;
}

export interface ManualAttendanceRequest {
    employeeId: string;
    date: string;
    checkIn: string;
    checkOut?: string;
    reason: string;
}

export interface AttendanceRecord {
    id?: string;
    employeeId?: string;
    employeeName?: string;
    date: string;
    checkIn?: string;
    checkInTime?: string;
    checkOut?: string;
    checkOutTime?: string;
    lateMin?: number;
    earlyLeaveMin?: number;
    workHours?: number;
    approvedOvertimeHours?: number;
    status: AttendanceStatus | string;
    method?: CheckInMethod;
    storeId?: string;
    isManualEntry?: boolean;
    manualReason?: string;
    shiftName?: string;
    shiftStart?: string;
    shiftEnd?: string;
}

export interface AttendanceQrCode {
    qrData: string;
    expiresIn: number;
    storeId?: string;
    generatedAt?: string;
}

export interface OvertimeRequest {
    id: string;
    employeeId: string;
    employeeName?: string;
    date: string;
    startTime: string;
    endTime: string;
    hours: number;
    reason?: string;
    status: OvertimeRequestStatus;
    expectedRate?: number; // 1.5 / 2.0 / 3.0
    approvedBy?: string;
    approvedAt?: string;
    rejectReason?: string;
    createdAt?: string;
}

export interface CreateOvertimeRequestDto {
    date: string;
    startTime: string;
    endTime: string;
    reason?: string;
}

export interface TimesheetDetail {
    employeeId: string;
    employeeName?: string;
    year: number;
    month: number;
    standardWorkDays?: number;
    actualWorkDays?: number;
    halfDays?: number;
    absentDays?: number;
    lateMinutes?: number;
    earlyLeaveMinutes?: number;
    overtimeWeekdayHours?: number;
    overtimeWeekendHours?: number;
    overtimeHolidayHours?: number;
    leaveDaysPaid?: number;
    leaveDaysUnpaid?: number;
    isLocked?: boolean;
    lockedAt?: string;
    lockedBy?: string;
    records?: AttendanceRecord[];
}

export interface PayslipLineItem {
    label: string;
    category: 'Income' | 'Deduction' | 'Insurance' | 'Tax' | 'Bonus' | 'Allowance' | 'Other';
    amount: number;
    taxable?: boolean;
    note?: string;
}

export interface PayslipDetail {
    payrollId: string;
    employeeId: string;
    employeeName?: string;
    employeeCode?: string;
    department?: string;
    position?: string;
    period: { month: number; year: number };
    baseSalary: number;
    grossPay?: number;
    netPay: number;
    totalIncome?: number;
    totalDeductions?: number;
    lineItems: PayslipLineItem[];
    bankAccount?: string;
    bankName?: string;
    paidAt?: string;
    status: PayrollStatus;
    notes?: string;
}

// ---------- Attendance (Phase 06) ----------
const _attendanceCheckIn = async (data: CheckInRequest): Promise<AttendanceRecord> => {
    const response = await client.post<AttendanceRecord>('/api/hr/attendance/check-in', data);
    return response.data;
};

const _attendanceCheckOut = async (data: CheckOutRequest): Promise<AttendanceRecord> => {
    const response = await client.post<AttendanceRecord>('/api/hr/attendance/check-out', data);
    return response.data;
};

const _attendanceQrCode = async (storeId?: string): Promise<AttendanceQrCode> => {
    const response = await client.get<AttendanceQrCode>('/api/hr/attendance/qr-code', {
        params: storeId ? { storeId } : undefined,
    });
    return response.data;
};

const _attendanceManual = async (data: ManualAttendanceRequest): Promise<AttendanceRecord> => {
    const response = await client.post<AttendanceRecord>('/api/hr/attendance/manual', data);
    return response.data;
};

const _attendanceList = async (params: { employeeId?: string; year?: number; month?: number; storeId?: string }): Promise<AttendanceRecord[]> => {
    const response = await client.get<AttendanceRecord[] | { items: AttendanceRecord[] }>('/api/hr/attendance', { params });
    const data = response.data;
    if (Array.isArray(data)) return data;
    return data?.items ?? [];
};

// ---------- Overtime ----------
const _overtimeCreate = async (data: CreateOvertimeRequestDto): Promise<OvertimeRequest> => {
    const response = await client.post<OvertimeRequest>('/api/hr/overtime', data);
    return response.data;
};

const _overtimePending = async (): Promise<OvertimeRequest[]> => {
    const response = await client.get<OvertimeRequest[]>('/api/hr/overtime/pending');
    return Array.isArray(response.data) ? response.data : [];
};

const _overtimeApprove = async (id: string): Promise<{ message: string }> => {
    const response = await client.post(`/api/hr/overtime/${id}/approve`);
    return response.data;
};

const _overtimeReject = async (id: string, reason: string): Promise<{ message: string }> => {
    const response = await client.post(`/api/hr/overtime/${id}/reject`, { reason });
    return response.data;
};

const _overtimeMine = async (): Promise<OvertimeRequest[]> => {
    const response = await client.get<OvertimeRequest[]>('/api/hr/overtime/mine');
    return Array.isArray(response.data) ? response.data : [];
};

// ---------- Leave (self-service extras) ----------
const _leaveMine = async (): Promise<LeaveRequest[]> => {
    const response = await client.get<LeaveRequest[]>('/api/hr/leave/mine');
    return Array.isArray(response.data) ? response.data : [];
};

const _leavePending = async (): Promise<LeaveRequest[]> => {
    const response = await client.get<LeaveRequest[]>('/api/hr/leave/pending');
    return Array.isArray(response.data) ? response.data : [];
};

const _leaveCreatePhase06 = async (data: {
    type: LeaveType;
    startDate: string;
    endDate: string;
    reason?: string;
}): Promise<LeaveRequest> => {
    const response = await client.post<LeaveRequest>('/api/hr/leave', data);
    return response.data;
};

const _leaveApprovePhase06 = async (id: string): Promise<{ message: string }> => {
    const response = await client.post(`/api/hr/leave/${id}/approve`);
    return response.data;
};

const _leaveRejectPhase06 = async (id: string, reason: string): Promise<{ message: string }> => {
    const response = await client.post(`/api/hr/leave/${id}/reject`, { reason });
    return response.data;
};

// ---------- Timesheet ----------
const _timesheetGet = async (employeeId: string, year: number, month: number): Promise<TimesheetDetail> => {
    const response = await client.get<TimesheetDetail>(`/api/hr/timesheet/${employeeId}`, {
        params: { year, month },
    });
    return response.data;
};

const _timesheetAggregate = async (employeeId: string, year: number, month: number): Promise<TimesheetDetail> => {
    const response = await client.post<TimesheetDetail>(`/api/hr/timesheet/${employeeId}/aggregate`, null, {
        params: { year, month },
    });
    return response.data;
};

// ---------- Payroll self-service ----------
const _payrollMine = async (year?: number): Promise<Payroll[]> => {
    const response = await client.get<Payroll[]>('/api/hr/payroll/mine', {
        params: year ? { year } : undefined,
    });
    return Array.isArray(response.data) ? response.data : [];
};

const _payrollGetById = async (payrollId: string): Promise<Payroll> => {
    const response = await client.get<Payroll>(`/api/hr/payroll/${payrollId}`);
    return response.data;
};

const _payslipGet = async (payrollId: string): Promise<PayslipDetail> => {
    const response = await client.get<PayslipDetail>(`/api/hr/payroll/${payrollId}/payslip`);
    return response.data;
};

// Named exports
export const attendanceApi = {
    checkIn: _attendanceCheckIn,
    checkOut: _attendanceCheckOut,
    qrCode: _attendanceQrCode,
    manual: _attendanceManual,
    list: _attendanceList,
};

export const overtimeApi = {
    create: _overtimeCreate,
    pending: _overtimePending,
    approve: _overtimeApprove,
    reject: _overtimeReject,
    mine: _overtimeMine,
};

export const leavePhase06Api = {
    mine: _leaveMine,
    pending: _leavePending,
    create: _leaveCreatePhase06,
    approve: _leaveApprovePhase06,
    reject: _leaveRejectPhase06,
};

export const timesheetApi = {
    get: _timesheetGet,
    aggregate: _timesheetAggregate,
};

export const payrollSelfServiceApi = {
    mine: _payrollMine,
    getById: _payrollGetById,
    payslip: _payslipGet,
};

// Label helpers
export const attendanceStatusLabels: Record<string, string> = {
    Present: 'Có mặt',
    Late: 'Đi trễ',
    Absent: 'Vắng',
    HalfDay: 'Nửa công',
    Holiday: 'Ngày lễ',
    OnLeave: 'Nghỉ phép',
    Weekend: 'Cuối tuần',
};

export const attendanceStatusColors: Record<string, string> = {
    Present: 'bg-green-100 text-green-800 border-green-200',
    Late: 'bg-orange-100 text-orange-800 border-orange-200',
    Absent: 'bg-red-100 text-red-800 border-red-200',
    HalfDay: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Holiday: 'bg-gray-100 text-gray-600 border-gray-200',
    OnLeave: 'bg-blue-100 text-blue-800 border-blue-200',
    Weekend: 'bg-slate-50 text-slate-500 border-slate-200',
};

export const overtimeStatusLabels: Record<OvertimeRequestStatus, string> = {
    Pending: 'Chờ duyệt',
    Approved: 'Đã duyệt',
    Rejected: 'Từ chối',
    Cancelled: 'Đã hủy',
};

/** Tính hệ số OT theo ngày (đơn giản, backend là nguồn chân lý). */
export const calculateOvertimeRate = (date: Date, isHoliday = false): number => {
    if (isHoliday) return 3.0;
    const day = date.getDay();
    if (day === 0) return 2.0; // Chủ nhật
    return 1.5;
};

export const overtimeRateLabel = (rate: number): string => {
    if (rate >= 3) return '300% (Ngày lễ)';
    if (rate >= 2) return '200% (Chủ nhật)';
    return '150% (Ngày thường)';
};
