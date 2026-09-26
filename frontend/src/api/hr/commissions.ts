import client from '../client';

// Hoa hồng kỹ thuật — docs/api-contracts/hr-commission.md.
// Đọc: HR.ViewPayroll. Ghi (đối soát/duyệt/huỷ/mức riêng): HR.ManagePayroll. "Của tôi": Staff.

export type CommissionStatus = 'Pending' | 'Approved' | 'Paid' | 'Reversed';

export interface CommissionEntryDto {
    id: string;
    employeeId: string;
    employeeName: string;
    sourceType: string;
    sourceId: string;
    sourceReference: string;
    baseAmount: number;
    ratePercent: number;
    fixedAmount: number;
    amount: number;
    period: string; // yyyy-MM
    earnedAt: string;
    status: CommissionStatus;
    approvedAt: string | null;
    approvedBy: string | null;
    reversedAt: string | null;
    reversalReason: string | null;
    payrollId: string | null;
    paidAt: string | null;
}

export interface CommissionTotals {
    pending: number;
    approved: number;
    paid: number;
    reversed: number;
    count: number;
}

export interface CommissionEmployeeSummary extends CommissionTotals {
    employeeId: string;
    employeeName: string;
}

export interface CommissionListResponse {
    period: string;
    totals: CommissionTotals;
    byEmployee: CommissionEmployeeSummary[];
    items: CommissionEntryDto[];
}

export interface CommissionSyncSummary {
    period: string;
    scanned: number;
    created: number;
    alreadyRecorded: number;
    reversed: number;
    clawbacksCreated: number;
    unmapped: string[];
}

export interface CommissionRateDto {
    laborPercent: number;
    fixedAmountPerJob: number;
    isDefault?: boolean;
}

export interface CommissionPolicyDto extends CommissionRateDto {
    id: string;
    effectiveFrom: string; // yyyy-MM-dd
    note: string | null;
    createdAt: string;
    createdBy: string | null;
}

export interface CommissionPoliciesResponse {
    default: CommissionRateDto;
    current: CommissionRateDto;
    history: CommissionPolicyDto[];
}

export interface CreateCommissionPolicyDto {
    laborPercent: number;
    fixedAmountPerJob: number;
    effectiveFrom: string;
    note?: string;
}

export interface MyCommissionsResponse {
    year: number;
    totals: Pick<CommissionTotals, 'pending' | 'approved' | 'paid'>;
    items: CommissionEntryDto[];
}

export const commissionsApi = {
    list: async (params: { period: string; employeeId?: string; status?: CommissionStatus }): Promise<CommissionListResponse> => {
        const { data } = await client.get<CommissionListResponse>('/hr/commissions', { params });
        return data;
    },
    sync: async (period: string): Promise<CommissionSyncSummary> => {
        const { data } = await client.post<CommissionSyncSummary>('/hr/commissions/sync', { period });
        return data;
    },
    approve: async (ids: string[]): Promise<{ approved: number; skipped: number }> => {
        const { data } = await client.post<{ approved: number; skipped: number }>('/hr/commissions/approve', { ids });
        return data;
    },
    reverse: async (id: string, reason: string): Promise<{ status: CommissionStatus; payrollNeedsRecalculation: boolean }> => {
        const { data } = await client.post(`/hr/commissions/${id}/reverse`, { reason });
        return data;
    },
    mine: async (year?: number): Promise<MyCommissionsResponse> => {
        const { data } = await client.get<MyCommissionsResponse>('/hr/commissions/mine', { params: year ? { year } : undefined });
        return data;
    },
    policies: async (employeeId: string): Promise<CommissionPoliciesResponse> => {
        const { data } = await client.get<CommissionPoliciesResponse>(`/hr/employees/${employeeId}/commission-policies`);
        return data;
    },
    addPolicy: async (employeeId: string, dto: CreateCommissionPolicyDto): Promise<CommissionPolicyDto> => {
        const { data } = await client.post<CommissionPolicyDto>(`/hr/employees/${employeeId}/commission-policies`, dto);
        return data;
    },
};

/** Thông điệp lỗi nghiệp vụ của server (`error` trong body RFC 9457), hoặc câu mặc định. */
export function commissionErrorMessage(error: unknown, fallback: string): string {
    const body = (error as { response?: { data?: { error?: unknown } } })?.response?.data;
    return typeof body?.error === 'string' && body.error.trim() ? body.error : fallback;
}

/** Kỳ yyyy-MM của hôm nay theo giờ Việt Nam. */
export function currentCommissionPeriod(now: Date = new Date()): string {
    const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return `${vn.getUTCFullYear()}-${String(vn.getUTCMonth() + 1).padStart(2, '0')}`;
}
