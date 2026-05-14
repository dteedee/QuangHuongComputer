import { client } from './client';

/**
 * TT133 Tax Reports API — Thông tư 133/2016/TT-BTC
 * Endpoints for B01-DNN, B02-DNN, B09-DNN, VAT 01/GTGT, PIT 05/KK-TNCN
 */

// ============================================
// TYPES
// ============================================

export interface BalanceSheetAssets {
    shortTerm: { cash: number; accountsReceivable: number; inventory: number; total: number };
    longTerm: { total: number };
    total: number;
}

export interface BalanceSheetReport {
    period: { year: number; quarter: number | null };
    assets: BalanceSheetAssets;
    liabilities: { accountsPayable: number; pendingExpenses: number; total: number };
    equity: { retainedEarnings: number; total: number };
    totalLiabilitiesAndEquity: number;
}

export interface IncomeStatementReport {
    period: { year: number; quarter: number | null; month: number | null; start: string; end: string };
    revenue: { goodsAndServices: number; vatAmount: number; discounts: number; netRevenue: number };
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    profitBeforeTax: number;
    incomeTax: number;
    netProfit: number;
    profitMargin: number;
}

export interface FinancialNotesReport {
    reportType: string;
    company: { name: string; taxCode: string; address: string; fiscalYear: number; currency: string; accountingStandard: string };
    accountingPolicies: { revenueRecognition: string; inventoryValuation: string; fixedAssetDepreciation: string; foreignCurrency: string };
    notes: {
        accountsReceivable: { totalInvoiced: number; outstanding: number; collectionRate: number };
        inventory: { totalValue: number; itemCount: number; valuationMethod: string };
        operatingExpenses: { categoryName: string; total: number; count: number }[];
    };
}

export interface VatDeclarationTT133 {
    reportType: string;
    period: { month: number; year: number };
    outputVAT: { taxableAmount: number; vatAmount: number; indicator26: number; indicator28: number };
    inputVAT: { taxableAmount: number; vatAmount: number; indicator23: number; indicator25: number };
    vatPayable: number;
    carryForward: number;
    indicator40: number;
    defaultVatRate: string;
}

export interface PitEmployeeSummary {
    employeeId: string;
    fullName: string;
    taxCode: string;
    department: string;
    monthsWorked: number;
    totalGrossIncome: number;
    insuranceDeduction: number;
    personalDeduction: number;
    taxableIncome: number;
    pitTax: number;
}

export interface PitSettlementReport {
    reportType: string;
    year: number;
    summary: { totalEmployees: number; totalGrossIncome: number; totalPitTax: number; personalDeductionPerYear: number };
    employees: PitEmployeeSummary[];
    pitBrackets: { range: string; rate: string }[];
}

// ============================================
// API
// ============================================

export const taxReportsApi = {
    /** B01-DNN: Báo cáo tình hình tài chính */
    getBalanceSheet: async (year: number, quarter?: number): Promise<BalanceSheetReport> => {
        const params: Record<string, unknown> = { year };
        if (quarter) params.quarter = quarter;
        const { data } = await client.get('/reporting/tax/balance-sheet', { params });
        return data;
    },

    /** B02-DNN: Báo cáo kết quả hoạt động kinh doanh */
    getIncomeStatement: async (year: number, quarter?: number, month?: number): Promise<IncomeStatementReport> => {
        const params: Record<string, unknown> = { year };
        if (quarter) params.quarter = quarter;
        if (month) params.month = month;
        const { data } = await client.get('/reporting/tax/income-statement', { params });
        return data;
    },

    /** B09-DNN: Thuyết minh báo cáo tài chính */
    getFinancialNotes: async (year: number): Promise<FinancialNotesReport> => {
        const { data } = await client.get('/reporting/tax/financial-notes', { params: { year } });
        return data;
    },

    /** Mẫu 01/GTGT: Tờ khai thuế GTGT theo TT133 */
    getVatDeclarationTT133: async (month: number, year: number): Promise<VatDeclarationTT133> => {
        const { data } = await client.get('/reporting/tax/vat-declaration', { params: { month, year } });
        return data;
    },

    /** Mẫu 05/KK-TNCN: Quyết toán thuế TNCN */
    getPitSettlement: async (year: number): Promise<PitSettlementReport> => {
        const { data } = await client.get('/reporting/tax/pit-settlement', { params: { year } });
        return data;
    },

    /** Export Balance Sheet as PDF */
    exportBalanceSheetPdf: async (year: number, quarter?: number): Promise<Blob> => {
        const params: Record<string, unknown> = { year };
        if (quarter) params.quarter = quarter;
        const { data } = await client.get('/reporting/tax/balance-sheet', {
            params: { ...params, format: 'pdf' },
            responseType: 'blob'
        });
        return data;
    },

    /** Export Income Statement as PDF */
    exportIncomeStatementPdf: async (year: number, quarter?: number, month?: number): Promise<Blob> => {
        const params: Record<string, unknown> = { year, format: 'pdf' };
        if (quarter) params.quarter = quarter;
        if (month) params.month = month;
        const { data } = await client.get('/reporting/tax/income-statement', {
            params,
            responseType: 'blob'
        });
        return data;
    },
};
