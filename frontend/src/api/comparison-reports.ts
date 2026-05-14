import client from './client';

export interface PeriodComparison<T> {
    period1: T;
    period2: T;
    change: Record<string, number>;
}

export interface RevenuePeriod {
    label: string;
    revenue: number;
    orderCount: number;
    avgOrderValue: number;
}

export interface OrderPeriod {
    total: number;
    completed: number;
    cancelled: number;
    cancelRate: number;
}

export interface ExpensePeriod {
    total: number;
    byCategory: { name: string; amount: number }[];
}

export interface TurnoverPeriod {
    turnoverRatio: number;
    avgDaysToSell: number;
    cogs: number;
    avgInventory: number;
}

const buildParams = (p1s: string, p1e: string, p2s: string, p2e: string) =>
    new URLSearchParams({ period1Start: p1s, period1End: p1e, period2Start: p2s, period2End: p2e });

export const comparisonApi = {
    compareRevenue: async (p1s: string, p1e: string, p2s: string, p2e: string) => {
        const { data } = await client.get<PeriodComparison<RevenuePeriod>>(`/reports/comparison/revenue?${buildParams(p1s, p1e, p2s, p2e)}`);
        return data;
    },
    compareOrders: async (p1s: string, p1e: string, p2s: string, p2e: string) => {
        const { data } = await client.get<PeriodComparison<OrderPeriod>>(`/reports/comparison/orders?${buildParams(p1s, p1e, p2s, p2e)}`);
        return data;
    },
    compareExpenses: async (p1s: string, p1e: string, p2s: string, p2e: string) => {
        const { data } = await client.get<PeriodComparison<ExpensePeriod>>(`/reports/comparison/expenses?${buildParams(p1s, p1e, p2s, p2e)}`);
        return data;
    },
    compareInventoryTurnover: async (p1s: string, p1e: string, p2s: string, p2e: string) => {
        const { data } = await client.get<PeriodComparison<TurnoverPeriod>>(`/reports/comparison/inventory-turnover?${buildParams(p1s, p1e, p2s, p2e)}`);
        return data;
    },
};
