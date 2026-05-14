import client from './client';

export interface CRMOverview {
  totalLeads: number;
  newLeadsThisMonth: number;
  convertedLeads: number;
  conversionRate: number;
  pipelineValue: number;
  avgDealSize: number;
  leadsBySource: { source: string; count: number }[];
  leadsByStatus: { status: string; count: number }[];
}

export interface CampaignPerformance {
  id: string;
  name: string;
  sentCount: number;
  totalRecipients: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  status: string;
  sentAt: string | null;
}

export interface CustomerSegmentStat {
  id: string;
  name: string;
  code: string;
  color: string;
  customerCount: number;
  avgLifetimeValue: number;
}

export interface LeadFunnelStage {
  id: string;
  name: string;
  color: string;
  winProbability: number;
  leadCount: number;
  totalValue: number;
  conversionFromPrevious: number;
}

export const crmReportsApi = {
  getOverview: async (): Promise<CRMOverview> => {
    const res = await client.get<CRMOverview>('/reports/crm/overview');
    return res.data;
  },

  getCampaignPerformance: async (): Promise<CampaignPerformance[]> => {
    const res = await client.get<CampaignPerformance[]>('/reports/crm/campaign-performance');
    return res.data;
  },

  getCustomerSegments: async (): Promise<CustomerSegmentStat[]> => {
    const res = await client.get<CustomerSegmentStat[]>('/reports/crm/customer-segments');
    return res.data;
  },

  getLeadFunnel: async (): Promise<LeadFunnelStage[]> => {
    const res = await client.get<LeadFunnelStage[]>('/reports/crm/lead-funnel');
    return res.data;
  },
};
