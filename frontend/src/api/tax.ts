import { client } from './client';

/**
 * Máy tính thuế Việt Nam — `POST /api/accounting/tax/*` (contract §9).
 * CALCULATION ONLY: this module reads and writes nothing.
 *
 * W3-13 removed from here (they belonged to other owners and three of them
 * called routes that no longer exist):
 *  · `issueEInvoice` / `getEInvoiceStatus` / `cancelEInvoice` → `api/accounting`
 *    (`einvoiceApi`); `cancel` was deleted by W2-24 with the fake MISA adapter.
 *  · `getVatLedger` / `getVatDeclaration` / `getCitReport` / `exportTaxReport`
 *    → `api/tax-reports.ts`, the single tax-report client. `exportTaxReport`
 *    called `/accounting/tax-reports/export/vat`, which does not exist.
 *  · the hardcoded `TAX_CONSTANTS` table — deductions and brackets are
 *    statutory and change by decree; read `taxApi.getRates()` instead, which
 *    returns the rates in force today plus their legal basis.
 */

// ============================================
// TYPES
// ============================================

export interface PitBracketDetail {
    from: number;
    to: number;
    rate: number;
    taxableAmount: number;
    taxAmount: number;
}

export interface PitCalculationResult {
    grossSalary: number;
    totalInsurance: number;
    preTaxIncome: number;
    personalDeduction: number;
    dependentDeductions: number;
    otherDeductions: number;
    taxableIncome: number;
    pitAmount: number;
    netSalary: number;
    effectiveTaxRate: number;
    brackets: PitBracketDetail[];
}

export interface InsuranceBreakdown {
    socialInsurance: number;
    healthInsurance: number;
    unemploymentInsurance: number;
    total: number;
}

export interface InsuranceCalculationResult {
    insurableSalary: number;
    employee: InsuranceBreakdown;
    employer: InsuranceBreakdown;
}

export interface VatCalculationResult {
    priceBeforeVat: number;
    vatRate: number;
    vatAmount: number;
    priceAfterVat: number;
    isExempt: boolean;
}

export interface CitCalculationResult {
    revenue: number;
    deductibleExpenses: number;
    taxableIncome: number;
    taxRate: number;
    citAmount: number;
}

export interface PayrollTaxResult {
    grossSalary: number;
    insurance: InsuranceCalculationResult;
    pit: PitCalculationResult;
    employeeDeductions: number;
    employerCosts: number;
    netSalary: number;
    totalCompanyCost: number;
}

export interface TaxRates {
    pit: {
        personalDeduction: number;
        dependentDeduction: number;
        brackets: { from: number; to: number; rate: number }[];
    };
    insurance: {
        employee: { bhxh: number; bhyt: number; bhtn: number; total: number };
        employer: { bhxh: number; bhyt: number; bhtn: number; total: number };
        maxInsurableSalary: number;
        baseSalary: number;
    };
    vat: { standard: number; telecom: number; export: number };
    cit: { standardRate: number };
}

// ============================================
// API
// ============================================

export const taxApi = {
    /** Calculate Personal Income Tax (Thuế TNCN) */
    calculatePit: async (data: {
        grossSalary: number;
        numberOfDependents?: number;
        socialInsurance?: number;
        healthInsurance?: number;
        unemploymentInsurance?: number;
        otherDeductions?: number;
    }): Promise<PitCalculationResult> => {
        const response = await client.post<PitCalculationResult>('/accounting/tax/pit', data);
        return response.data;
    },

    /** Calculate Social/Health/Unemployment Insurance */
    calculateInsurance: async (data: {
        grossSalary: number;
        regionalMinSalary?: number;
    }): Promise<InsuranceCalculationResult> => {
        const response = await client.post<InsuranceCalculationResult>('/accounting/tax/insurance', data);
        return response.data;
    },

    /** Calculate VAT (Thuế GTGT) */
    calculateVat: async (data: {
        amount: number;
        vatRate?: number;
        isInclusive?: boolean;
    }): Promise<VatCalculationResult> => {
        const response = await client.post<VatCalculationResult>('/accounting/tax/vat', data);
        return response.data;
    },

    /** Calculate Corporate Income Tax (Thuế TNDN) */
    calculateCit: async (data: {
        revenue: number;
        deductibleExpenses: number;
    }): Promise<CitCalculationResult> => {
        const response = await client.post<CitCalculationResult>('/accounting/tax/cit', data);
        return response.data;
    },

    /** Full Payroll: Gross → Insurance → PIT → Net */
    calculatePayroll: async (data: {
        grossSalary: number;
        numberOfDependents?: number;
        otherDeductions?: number;
        regionalMinSalary?: number;
    }): Promise<PayrollTaxResult> => {
        const response = await client.post<PayrollTaxResult>('/accounting/tax/payroll', data);
        return response.data;
    },

    /** Get current Vietnamese tax rates */
    getRates: async (): Promise<TaxRates> => {
        const response = await client.get<TaxRates>('/accounting/tax/rates');
        return response.data;
    },

};

// ============================================
// LABELS & CONSTANTS
// ============================================

/**
 * Bracket labels are NOT hardcoded any more: `taxApi.getRates()` returns the
 * brackets in force today (`pit.brackets`) together with their legal basis.
 * The old constant said "Đến 5 triệu / 11.000.000đ giảm trừ", which the
 * statutory parameters of 2026 have already superseded.
 */
export const INSURANCE_LABELS = {
    bhxh: 'Bảo hiểm xã hội (BHXH)',
    bhyt: 'Bảo hiểm y tế (BHYT)',
    bhtn: 'Bảo hiểm thất nghiệp (BHTN)',
};

export const formatVND = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
};
