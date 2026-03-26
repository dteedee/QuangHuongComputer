import client from './client';

// ========================================
// Reporting Types
// ========================================

export interface MonthlySalesData {
  year: number;
  month: number;
  revenue: number;
  orderCount: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
}

export interface SalesSummary {
  totalOrders: number;
  totalRevenue: number;
  monthRevenue: number;
  todayRevenue: number;
  todayOrders: number;
  monthlyData: MonthlySalesData[];
  statusDistribution: StatusDistribution[];
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

export interface InventoryValue {
  totalValue: number;
  itemCount: number;
  totalQuantity: number;
  lowStockItems: {
    productId: string;
    productName: string;
    quantityOnHand: number;
    lowStockThreshold: number;
    averageCost: number;
  }[];
}

export interface TechPerformance {
  totalJobs: number;
  completedJobs: number;
  successRate: number;
  averageRepairCost: number;
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

// ========================================
// Reporting API
// ========================================
export const reportsApi = {
  /**
   * Get sales summary with monthly chart data
   */
  getSalesSummary: async (startDate?: string, endDate?: string): Promise<SalesSummary> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await client.get<SalesSummary>(`/reports/sales-summary?${params.toString()}`);
    return response.data;
  },

  /**
   * Get top-selling products
   */
  getTopProducts: async (top: number = 10, startDate?: string, endDate?: string): Promise<TopProduct[]> => {
    const params = new URLSearchParams();
    params.append('top', top.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await client.get<TopProduct[]>(`/reports/top-products?${params.toString()}`);
    return response.data;
  },

  /**
   * Get top customers by spending
   */
  getTopCustomers: async (top: number = 10): Promise<TopCustomer[]> => {
    const response = await client.get<TopCustomer[]>(`/reports/top-customers?top=${top}`);
    return response.data;
  },

  /**
   * Get inventory value and low-stock alerts
   */
  getInventoryValue: async (): Promise<InventoryValue> => {
    const response = await client.get<InventoryValue>('/reports/inventory-value');
    return response.data;
  },

  /**
   * Get tech/repair performance stats
   */
  getTechPerformance: async (): Promise<TechPerformance> => {
    const response = await client.get<TechPerformance>('/reports/tech-performance');
    return response.data;
  },

  /**
   * Get full business overview across all modules
   */
  getBusinessOverview: async (): Promise<BusinessOverview> => {
    const response = await client.get<BusinessOverview>('/reports/business-overview');
    return response.data;
  },

  /**
   * Export sales report as Excel
   */
  exportSalesExcel: async (startDate?: string, endDate?: string): Promise<void> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await client.get(`/reports/export/sales?${params.toString()}`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bao-cao-ban-hang-${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
