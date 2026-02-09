import client from './client';

export interface SalesSummary {
    totalOrders: number;
    totalRevenue: number;
    monthRevenue: number;
    monthlyData: {
        year: number;
        month: number;
        revenue: number;
    }[];
}

export interface InventoryValue {
    totalValue: number;
    itemCount: number;
}

export interface TechPerformance {
    totalJobs: number;
    completedJobs: number;
    successRate: number;
    averageRepairCost: number;
}

export const reportingApi = {
    getSalesSummary: async () => {
        const response = await client.get<SalesSummary>('/reports/sales-summary');
        return response.data;
    },

    getInventoryValue: async () => {
        const response = await client.get<InventoryValue>('/reports/inventory-value');
        return response.data;
    },

    getTechPerformance: async () => {
        const response = await client.get<TechPerformance>('/reports/tech-performance');
        return response.data;
    },

    getArAging: async () => {
        const response = await client.get<ArAgingAccount[]>('/reports/ar-aging');
        return response.data;
    }
};

export interface ArAgingAccount {
    id: string;
    name: string;
    balance: number;
    creditLimit: number;
}
