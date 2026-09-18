import client from '../client';

// D06 / docs/api-contracts/hr-statutory.md — tham số lương/thuế TNCN/bảo hiểm hiệu lực theo ngày.
// Đọc: HR.ViewPayroll. Ghi: HR.ManageStatutoryParameters (Admin, Accountant — HR chỉ xem).

export type StatutoryParameterUnit = 'VND' | 'RATE' | 'HOURS' | 'JSON' | 'TEXT';

export interface StatutoryParameterDto {
    id: string;
    code: string;
    effectiveFrom: string; // yyyy-MM-dd
    numberValue: number | null;
    jsonValue: string | null;
    unit: StatutoryParameterUnit;
    legalBasis: string;
    sourceUrl: string;
    note: string | null;
    isSeed: boolean;
    isVerified: boolean;
    isLocked: boolean;
}

export interface CreateStatutoryParameterDto {
    code: string;
    effectiveFrom: string;
    numberValue?: number | null;
    jsonValue?: string | null;
    unit: StatutoryParameterUnit;
    legalBasis: string;
    sourceUrl: string;
    note?: string;
    isVerified?: boolean;
    reason?: string;
}

export interface StatutoryResolvedSet {
    asOf: string;
    pitPersonalDeduction: number;
    pitDependentDeduction: number;
    pitBrackets: { upTo: number | null; rate: number; quickDeduction: number }[];
    pitFlatRate: number;
    pitFlatThreshold: number;
    pitOvertimeExemptMode: string;
    pitMealTaxFreeCap: number;
    siReferenceLevel: number;
    socialInsuranceCap: number;
    companyWageRegion: string;
    unemploymentCap: number;
    regionalMinWage: { monthlyWage: number; hourlyWage: number };
    rates: Record<string, number>;
    overtimeMultipliers: Record<string, number>;
    overtimeLimits: { month: number; year: number };
    probationMinRatio: number;
    legalBasis: Record<string, { effectiveFrom: string; legalBasis: string; sourceUrl: string; isVerified: boolean }>;
}

export interface PublicHolidayDto {
    id: string;
    date: string;
    name: string;
    isPaid: boolean;
    isConfirmed: boolean;
    legalBasis: string | null;
    note: string | null;
}

export interface UpsertPublicHolidayDto {
    date: string;
    name: string;
    isPaid?: boolean;
    isConfirmed?: boolean;
    legalBasis?: string;
    note?: string;
}

const BASE = '/hr/statutory-parameters';

export const statutoryParametersApi = {
    list: async (params?: { code?: string; asOf?: string }): Promise<StatutoryParameterDto[]> => {
        const { data } = await client.get<StatutoryParameterDto[]>(BASE, { params });
        return data;
    },
    resolved: async (asOf?: string): Promise<StatutoryResolvedSet> => {
        const { data } = await client.get<StatutoryResolvedSet>(`${BASE}/resolved`, { params: asOf ? { asOf } : undefined });
        return data;
    },
    codes: async (): Promise<string[]> => {
        const { data } = await client.get<string[]>(`${BASE}/codes`);
        return data;
    },
    create: async (dto: CreateStatutoryParameterDto): Promise<StatutoryParameterDto> => {
        const { data } = await client.post<StatutoryParameterDto>(BASE, dto);
        return data;
    },
    update: async (id: string, dto: Omit<CreateStatutoryParameterDto, 'code' | 'effectiveFrom'>): Promise<StatutoryParameterDto> => {
        const { data } = await client.put<StatutoryParameterDto>(`${BASE}/${id}`, dto);
        return data;
    },
    delete: async (id: string): Promise<void> => {
        await client.delete(`${BASE}/${id}`);
    },
};

export const publicHolidaysApi = {
    list: async (params?: { year?: number; unconfirmedOnly?: boolean }): Promise<PublicHolidayDto[]> => {
        const { data } = await client.get<PublicHolidayDto[]>('/hr/public-holidays', { params });
        return data;
    },
    confirm: async (id: string): Promise<PublicHolidayDto> => {
        const { data } = await client.post<PublicHolidayDto>(`/hr/public-holidays/${id}/confirm`);
        return data;
    },
};
