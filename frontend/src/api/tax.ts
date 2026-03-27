import { client } from './client';

/**
 * Vietnamese Tax Engine API
 * Frontend module for tax calculations (PIT, VAT, Insurance, CIT, Payroll)
 * Phase 2.5
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

export interface IssueEInvoiceRequest {
    provider: string;
    taxCode: string;
    buyerName: string;
    buyerAddress: string;
    buyerEmail: string;
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

    // ============================================
    // E-INVOICE (Hóa đơn điện tử)
    // ============================================
    issueEInvoice: async (orderId: string, data: IssueEInvoiceRequest): Promise<any> => {
        const response = await client.post(`/accounting/einvoice/issue/${orderId}`, data);
        return response.data;
    },
    getEInvoiceStatus: async (invoiceId: string): Promise<any> => {
        const response = await client.get(`/accounting/einvoice/status/${invoiceId}`);
        return response.data;
    },
    cancelEInvoice: async (invoiceId: string, reason: string): Promise<any> => {
        const response = await client.post(`/accounting/einvoice/cancel/${invoiceId}`, { reason });
        return response.data;
    },

    // ============================================
    // TAX REPORTING (Báo cáo thuế)
    // ============================================
    getVatLedger: async (month: number, year: number, type: 'in' | 'out'): Promise<any> => {
        const response = await client.get('/accounting/tax-reports/vat-ledger', { params: { month, year, type } });
        return response.data;
    },
    getVatDeclaration: async (quarter: number, year: number): Promise<any> => {
        const response = await client.get('/accounting/tax-reports/vat-declaration', { params: { quarter, year } });
        return response.data;
    },
    getCitReport: async (year: number): Promise<any> => {
        const response = await client.get('/accounting/tax-reports/cit-report', { params: { year } });
        return response.data;
    }
};

// ============================================
// LABELS & CONSTANTS
// ============================================

export const TAX_CONSTANTS = {
    PERSONAL_DEDUCTION: 11_000_000,   // VND/month
    DEPENDENT_DEDUCTION: 4_400_000,   // VND/dependent/month
    VAT_STANDARD: 0.08,              // 8%
    VAT_TELECOM: 0.10,               // 10%
    CIT_RATE: 0.20,                  // 20%
    BASE_SALARY_2025: 2_340_000,     // Mức lương cơ sở 2025
    MAX_INSURABLE: 46_800_000,       // 20x base salary
    REGIONAL_MIN_SALARY: {
        I: 4_960_000,    // Vùng I
        II: 4_410_000,   // Vùng II
        III: 3_860_000,  // Vùng III
        IV: 3_450_000,   // Vùng IV
    }
};

export const PIT_BRACKET_LABELS = [
    { range: 'Đến 5 triệu', rate: '5%' },
    { range: '5 - 10 triệu', rate: '10%' },
    { range: '10 - 18 triệu', rate: '15%' },
    { range: '18 - 32 triệu', rate: '20%' },
    { range: '32 - 52 triệu', rate: '25%' },
    { range: '52 - 80 triệu', rate: '30%' },
    { range: 'Trên 80 triệu', rate: '35%' },
];

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
