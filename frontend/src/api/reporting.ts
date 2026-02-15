import client from './client';

// Types
export interface SalesSummary {
    totalOrders: number;
    totalRevenue: number;
    monthRevenue: number;
    todayRevenue: number;
    todayOrders: number;
    monthlyData: {
        year: number;
        month: number;
        revenue: number;
        orderCount: number;
    }[];
    statusDistribution: {
        status: string;
        count: number;
    }[];
}

export interface InventoryValue {
    totalValue: number;
    itemCount: number;
    totalQuantity: number;
    lowStockItems: {
        productId: string;
        productName: string;
        quantityOnHand: number;
        reorderPoint: number;
        averageCost: number;
    }[];
}

export interface TechPerformance {
    totalJobs: number;
    completedJobs: number;
    successRate: number;
    averageRepairCost: number;
}

export interface ArAgingAccount {
    id: string;
    name: string;
    balance: number;
    creditLimit: number;
}

export interface TopProduct {
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
}

export interface TopCustomer {
    customerId: string;
    customerName: string;
    email: string;
    totalSpent: number;
    orderCount: number;
    lastOrderDate: string;
}

export interface TopTechnician {
    technicianId: string;
    technicianName: string;
    specialty: string;
    totalJobs: number;
    completedJobs: number;
    successRate: number;
    totalRevenue: number;
    avgCompletionHours: number;
}

export interface BusinessOverview {
    sales: {
        thisMonthRevenue: number;
        lastMonthRevenue: number;
        growthPercent: number;
        pendingOrders: number;
    };
    inventory: {
        totalValue: number;
        lowStockCount: number;
    };
    repairs: {
        pendingCount: number;
        thisMonthRevenue: number;
    };
    accounting: {
        totalReceivables: number;
    };
}

// API Functions
export const reportingApi = {
    // Sales reports
    getSalesSummary: async (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const response = await client.get<SalesSummary>(`/reports/sales-summary?${params}`);
        return response.data;
    },

    getTopProducts: async (top = 10, startDate?: string, endDate?: string) => {
        const params = new URLSearchParams({ top: top.toString() });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const response = await client.get<TopProduct[]>(`/reports/top-products?${params}`);
        return response.data;
    },

    getTopCustomers: async (top = 10) => {
        const response = await client.get<TopCustomer[]>(`/reports/top-customers?top=${top}`);
        return response.data;
    },

    // Inventory reports
    getInventoryValue: async () => {
        const response = await client.get<InventoryValue>('/reports/inventory-value');
        return response.data;
    },

    // Accounting
    getArAging: async () => {
        const response = await client.get<ArAgingAccount[]>('/reports/ar-aging');
        return response.data;
    },

    // Technician reports
    getTechPerformance: async () => {
        const response = await client.get<TechPerformance>('/reports/tech-performance');
        return response.data;
    },

    getTopTechnicians: async (top = 10) => {
        const response = await client.get<TopTechnician[]>(`/reports/top-technicians?top=${top}`);
        return response.data;
    },

    // Business overview
    getBusinessOverview: async () => {
        const response = await client.get<BusinessOverview>('/reports/business-overview');
        return response.data;
    },

    // Excel exports
    exportSales: async (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const response = await client.get(`/reports/export/sales?${params}`, {
            responseType: 'blob'
        });
        downloadBlob(response.data, `BaoCaoBanHang_${formatDate(startDate)}_${formatDate(endDate)}.xlsx`);
    },

    exportTopProducts: async (top = 50) => {
        const response = await client.get(`/reports/export/top-products?top=${top}`, {
            responseType: 'blob'
        });
        downloadBlob(response.data, 'TopSanPham.xlsx');
    },

    exportTechnicians: async () => {
        const response = await client.get('/reports/export/technicians', {
            responseType: 'blob'
        });
        downloadBlob(response.data, 'HieuSuatKyThuatVien.xlsx');
    },

    exportInventory: async () => {
        const response = await client.get('/reports/export/inventory', {
            responseType: 'blob'
        });
        downloadBlob(response.data, `TonKho_${new Date().toISOString().split('T')[0]}.xlsx`);
    },

    exportFullReport: async () => {
        const response = await client.get('/reports/export/full-report', {
            responseType: 'blob'
        });
        downloadBlob(response.data, `BaoCaoTongHop_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
};

// Helper functions
function downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

function formatDate(date?: string): string {
    if (!date) return new Date().toISOString().split('T')[0].replace(/-/g, '');
    return date.replace(/-/g, '');
}

// ============================================
// Financial Reports Types
// ============================================

export interface CashFlowReport {
    period: { start: string; end: string };
    totalInflows: number;
    totalOutflows: number;
    netCashFlow: number;
    breakdown: {
        arCollected: number;
        apPaid: number;
        expensesPaid: number;
    };
    monthlyInflows: { month: string; amount: number }[];
    monthlyOutflows: { month: string; amount: number }[];
}

export interface RevenueExpenseReport {
    period: { start: string; end: string };
    summary: {
        totalRevenue: number;
        totalExpenses: number;
        grossProfit: number;
        profitMargin: number;
    };
    monthlyData: {
        month: string;
        revenue: number;
        expense: number;
        profit: number;
    }[];
    expenseByCategory: {
        categoryName: string;
        total: number;
        count: number;
    }[];
}

export interface BalanceOverview {
    assets: {
        accountsReceivable: number;
        inventoryValue: number;
        totalAssets: number;
    };
    liabilities: {
        accountsPayable: number;
        pendingExpenses: number;
        totalLiabilities: number;
    };
    netPosition: number;
    arAgingBreakdown: { bucket: string; amount: number; count: number }[];
    apAgingBreakdown: { bucket: string; amount: number; count: number }[];
}

// ============================================
// Financial Reports API
// ============================================

export const financialApi = {
    getCashFlow: async (startDate?: string, endDate?: string): Promise<CashFlowReport> => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const response = await client.get<CashFlowReport>(`/reports/cash-flow?${params}`);
        return response.data;
    },

    getRevenueExpense: async (startDate?: string, endDate?: string): Promise<RevenueExpenseReport> => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const response = await client.get<RevenueExpenseReport>(`/reports/revenue-expense?${params}`);
        return response.data;
    },

    getBalanceOverview: async (): Promise<BalanceOverview> => {
        const response = await client.get<BalanceOverview>('/reports/balance-overview');
        return response.data;
    },

    exportFinancialReport: async (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const response = await client.get(`/reports/export/financial?${params}`, {
            responseType: 'blob'
        });
        downloadBlob(response.data, `BaoCaoTaiChinh_${formatDate(startDate)}_${formatDate(endDate)}.xlsx`);
    }
};
