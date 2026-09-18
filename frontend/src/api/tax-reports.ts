/**
 * Tax reports — the ONE module behind the 8 tabs of `/backoffice/accounting/tax-reports`.
 *
 * Before W3-13 the screen used two clients: `api/tax-reports.ts` pointed at
 * `/api/reporting/tax/*` (a prefix that has never existed — 5 of 8 tabs 404'd)
 * and `api/tax.ts` carried a third copy of the accounting tax routes. The real
 * split is by OWNER, and it is kept here explicitly:
 *
 *  · `/api/reports/*`                  — W2-25, `Reporting/Endpoints/TaxReportEndpoints.cs`
 *     balance-sheet · income-statement · financial-notes · vat-declaration (01/GTGT) · pit-settlement
 *  · `/api/accounting/tax-reports/*`   — W2-25, `Accounting/TaxReportingEndpoints.cs`
 *     vat-ledger · vat-declaration (kỳ) · cit-report
 *
 * Permissions: `Reporting.ViewFinancial` for the first group, module Accounting
 * for the second. There is no server-side export for these reports yet
 * (integration-requests-w3.md, W3-13 #2) — `toCsv` below serialises exactly the
 * rows the API returned, it never invents a number.
 */
import { client } from './client';

/* ---------------------------------------------------------------- reports/* */

export interface BalanceSheetReport {
    period: { year: number; quarter: number | null };
    assets: {
        shortTerm: { cash: number; accountsReceivable: number; inventory: number; total: number };
        longTerm: { total: number };
        total: number;
    };
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

/** Mẫu 01/GTGT (Reporting owner). Indicator numbers are the official form boxes. */
export interface VatDeclarationForm {
    reportType: string;
    period: { month: number; year: number };
    outputVAT: { taxableAmount: number; vatAmount: number; indicator26: number; indicator28: number };
    inputVAT: { taxableAmount: number; vatAmount: number; indicator23: number; indicator25: number };
    vatPayable: number;
    carryForward: number;
    indicator40: number;
    defaultVatRate: string;
}

export interface PitSettlementEmployee {
    employeeId: string;
    fullName: string;
    taxCode: string;
    monthsWorked: number;
    totalTaxableIncome: number;
    insuranceDeduction: number;
    personalDeduction: number;
    dependentDeduction: number;
    dependentMonthCount: number;
    assessableIncome: number;
    pitTax: number;
    pitWithheld: number;
    pitOverpayment: number;
    pitShortfall: number;
}

export interface PitSettlementReport {
    reportType: string;
    year: number;
    parametersAsOf: string;
    summary: {
        totalEmployees: number;
        totalTaxableIncome: number;
        totalInsurance: number;
        totalPitTax: number;
        totalPitWithheld: number;
        personalDeductionPerMonth: number;
        personalDeductionPerYear: number;
        dependentDeductionPerMonth: number;
    };
    employees: PitSettlementEmployee[];
    pitBrackets: { upToMonthly: number | null; upToAnnual: number | null; rate: number; rateLabel: string }[];
    legalBasis?: string | null;
}

/* ------------------------------------------------- accounting/tax-reports/* */

export interface VatLedgerRecord {
    invoiceNo: string;
    date: string;
    buyer: string;
    gross: number;
    taxRate: number;
    taxAmount: number;
}

export interface VatLedgerReport {
    month: number;
    year: number;
    type: 'in' | 'out';
    totalGross: number;
    totalTax: number;
    records: VatLedgerRecord[];
}

export interface VatPeriodDeclaration {
    period: string;
    type: string;
    startDate: string;
    endDate: string;
    outputVat: { invoiceCount: number; revenue: number; vatAmount: number };
    inputVat: { invoiceCount: number; vatAmount: number };
    vatPayable: number;
    vatRefundable: number;
}

export interface CitReport {
    year: number;
    totalRevenue: number;
    deductibleExpenses: number;
    taxableIncome: number;
    citRate: number;
    citPayable: number;
}

export const taxReportsApi = {
    /** B01-DNN — Báo cáo tình hình tài chính. */
    balanceSheet: async (year: number, quarter?: number): Promise<BalanceSheetReport> => {
        const { data } = await client.get('/reports/balance-sheet', { params: { year, quarter } });
        return data;
    },
    /** B02-DNN — Báo cáo kết quả hoạt động kinh doanh. */
    incomeStatement: async (year: number, quarter?: number, month?: number): Promise<IncomeStatementReport> => {
        const { data } = await client.get('/reports/income-statement', { params: { year, quarter, month } });
        return data;
    },
    /** B09-DNN — Thuyết minh báo cáo tài chính. */
    financialNotes: async (year: number): Promise<FinancialNotesReport> => {
        const { data } = await client.get('/reports/financial-notes', { params: { year } });
        return data;
    },
    /** Mẫu 01/GTGT — tờ khai thuế GTGT tháng. */
    vatDeclarationForm: async (month: number, year: number): Promise<VatDeclarationForm> => {
        const { data } = await client.get('/reports/vat-declaration', { params: { month, year } });
        return data;
    },
    /** Mẫu 05/KK-TNCN — quyết toán thuế TNCN. */
    pitSettlement: async (year: number): Promise<PitSettlementReport> => {
        const { data } = await client.get('/reports/pit-settlement', { params: { year } });
        return data;
    },

    /** Bảng kê hoá đơn GTGT bán ra (`out`) / mua vào (`in`). */
    vatLedger: async (month: number, year: number, type: 'in' | 'out'): Promise<VatLedgerReport> => {
        const { data } = await client.get('/accounting/tax-reports/vat-ledger', { params: { month, year, type } });
        return data;
    },
    /** Tổng hợp GTGT theo kỳ: `period` = `2026-09` (monthly) hoặc `2026-Q3` (quarterly). */
    vatPeriodDeclaration: async (period: string, type: 'monthly' | 'quarterly' = 'monthly'): Promise<VatPeriodDeclaration> => {
        const { data } = await client.get('/accounting/tax-reports/vat-declaration', { params: { period, type } });
        return data;
    },
    /** Tờ khai thuế TNDN tạm tính theo năm. */
    citReport: async (year: number): Promise<CitReport> => {
        const { data } = await client.get('/accounting/tax-reports/cit-report', { params: { year } });
        return data;
    },
};

/**
 * CSV (UTF-8 BOM, Excel-friendly) built from rows the API already returned.
 * Not a server export and not a mock: same numbers, different container.
 */
export function toCsv(headers: string[], rows: (string | number)[][]): Blob {
    const escape = (v: string | number) => {
        const s = String(v ?? '');
        return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const body = [headers, ...rows].map((r) => r.map(escape).join(';')).join('\r\n');
    const bom = '\uFEFF'; // BOM so Excel opens the file as UTF-8
    return new Blob([`${bom}${body}`], { type: 'text/csv;charset=utf-8' });
}

/** Browser download helper shared by every export button on the tax screens. */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
