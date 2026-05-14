import client from './client';

export interface WarrantySummary {
  totalClaims: number;
  resolvedClaims: number;
  pendingClaims: number;
  rejectedClaims: number;
  resolutionRate: number;
  avgResolutionDays: number;
  byStatus: { status: string; count: number }[];
  monthlyTrend: { month: string; filed: number; resolved: number }[];
}

export interface WarrantyByBrand {
  productName: string;
  totalClaims: number;
  resolvedClaims: number;
  avgResolutionDays: number;
}

export interface WarrantyCosts {
  totalWarrantyCost: number;
  avgCostPerClaim: number;
  resolvedClaimCount: number;
  monthlyCosts: { month: string; claimCount: number; estimatedCost: number }[];
}

export interface WarrantyTrendingItem {
  serialPrefix: string;
  claimCount: number;
  commonIssue: string;
  trend: 'High' | 'Medium' | 'Low';
}

export const warrantyReportsApi = {
  getSummary: async (startDate?: string, endDate?: string): Promise<WarrantySummary> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const res = await client.get<WarrantySummary>(`/reports/warranty/summary?${params}`);
    return res.data;
  },

  getByBrand: async (startDate?: string, endDate?: string): Promise<WarrantyByBrand[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const res = await client.get<WarrantyByBrand[]>(`/reports/warranty/by-brand?${params}`);
    return res.data;
  },

  getCosts: async (startDate?: string, endDate?: string): Promise<WarrantyCosts> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const res = await client.get<WarrantyCosts>(`/reports/warranty/costs?${params}`);
    return res.data;
  },

  getTrending: async (top = 10, period = 30): Promise<WarrantyTrendingItem[]> => {
    const res = await client.get<WarrantyTrendingItem[]>(
      `/reports/warranty/trending?top=${top}&period=${period}`
    );
    return res.data;
  },
};
