import client from './client';

// ============================================
// CRM API Types
// ============================================

// Enums
export type LifecycleStage = 'New' | 'Active' | 'AtRisk' | 'Churned' | 'VIP' | 'Champion';
export type LeadSource = 'Website' | 'Referral' | 'Advertisement' | 'SocialMedia' | 'Event' | 'ColdCall' | 'Email' | 'Partner' | 'Other';
export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
export type InteractionType = 'Note' | 'Call' | 'Email' | 'Meeting' | 'Task' | 'SMS' | 'Chat' | 'SocialMedia';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
export type CampaignStatus = 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Paused' | 'Cancelled';

// Customer Analytics
export interface CustomerAnalytics {
  id: string;
  userId: string;
  userName?: string;
  email?: string;
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  totalRfmScore: number;
  totalOrderCount: number;
  totalSpent: number;
  averageOrderValue: number;
  firstPurchaseDate?: string;
  lastPurchaseDate?: string;
  daysSinceLastPurchase: number;
  lifecycleStage: LifecycleStage;
  lifecycleStageName: string;
  createdAt: string;
  segments: string[];
}

export interface CustomerDetail {
  id: string;
  userId: string;
  userName?: string;
  email?: string;
  phone?: string;
  address?: string;
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  totalRfmScore: number;
  totalOrderCount: number;
  totalSpent: number;
  averageOrderValue: number;
  firstPurchaseDate?: string;
  lastPurchaseDate?: string;
  lifecycleStage: LifecycleStage;
  lifecycleStageName: string;
  emailOpenCount: number;
  emailClickCount: number;
  lastEmailOpenedAt?: string;
  lastInteractionAt?: string;
  internalNotes?: string;
  segments: Segment[];
  recentInteractions: Interaction[];
  pendingTasks: Task[];
}

// Segment
export interface Segment {
  id: string;
  name: string;
  code: string;
  description?: string;
  color: string;
  isAutoAssign: boolean;
  sortOrder: number;
  customerCount: number;
  createdAt: string;
}

export interface CreateSegmentDto {
  name: string;
  code: string;
  description?: string;
  color: string;
  sortOrder: number;
}

export interface UpdateSegmentDto {
  name: string;
  description?: string;
  color: string;
  sortOrder: number;
}

// Lead
export interface Lead {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source: LeadSource;
  sourceName: string;
  status: LeadStatus;
  statusName: string;
  pipelineStageId?: string;
  pipelineStageName?: string;
  assignedToUserName?: string;
  estimatedValue?: number;
  nextFollowUpAt?: string;
  isConverted: boolean;
  createdAt: string;
}

export interface LeadDetail {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source: LeadSource;
  sourceName: string;
  sourceDetail?: string;
  status: LeadStatus;
  statusName: string;
  pipelineStageId?: string;
  pipelineStageName?: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  estimatedValue?: number;
  currency?: string;
  nextFollowUpAt?: string;
  nextFollowUpNote?: string;
  isConverted: boolean;
  convertedCustomerId?: string;
  convertedAt?: string;
  lossReason?: string;
  notes?: string;
  address?: string;
  city?: string;
  district?: string;
  interestedProducts?: string;
  interactions: Interaction[];
  createdAt: string;
}

export interface CreateLeadDto {
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source: LeadSource;
  sourceDetail?: string;
  estimatedValue?: number;
  notes?: string;
  address?: string;
  city?: string;
  district?: string;
}

export interface UpdateLeadDto {
  fullName: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  estimatedValue?: number;
  notes?: string;
  address?: string;
  city?: string;
  district?: string;
}

// Pipeline Stage
export interface PipelineStage {
  id: string;
  name: string;
  description?: string;
  color: string;
  sortOrder: number;
  winProbability: number;
  isFinalStage: boolean;
  isWonStage: boolean;
  leadCount: number;
  totalEstimatedValue: number;
}

export interface CreatePipelineStageDto {
  name: string;
  description?: string;
  color: string;
  sortOrder: number;
  winProbability: number;
}

// Interaction
export interface Interaction {
  id: string;
  type: InteractionType;
  typeName: string;
  subject: string;
  content?: string;
  performedByUserName: string;
  performedAt: string;
  durationMinutes?: number;
  callOutcome?: string;
  meetingLocation?: string;
  followUpDate?: string;
  followUpNote?: string;
  sentiment?: string;
}

export interface CreateInteractionDto {
  type: InteractionType;
  subject: string;
  content?: string;
  performedAt?: string;
  durationMinutes?: number;
  callOutcome?: string;
  meetingLocation?: string;
  followUpDate?: string;
  followUpNote?: string;
  sentiment?: string;
}

// Task
export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  priorityName: string;
  status: TaskStatus;
  statusName: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  dueDate?: string;
  completedAt?: string;
  reminderAt?: string;
  customerAnalyticsId?: string;
  leadId?: string;
  createdAt: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  reminderAt?: string;
}

// Campaign
export interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  statusName: string;
  targetSegmentId?: string;
  targetSegmentName?: string;
  scheduledAt?: string;
  sentAt?: string;
  totalRecipients: number;
  openedCount: number;
  clickedCount: number;
  openRate: number;
  clickRate: number;
  createdAt: string;
}

export interface CampaignDetail {
  id: string;
  name: string;
  subject: string;
  previewText?: string;
  htmlContent: string;
  plainTextContent?: string;
  status: CampaignStatus;
  statusName: string;
  targetSegmentId?: string;
  targetSegmentName?: string;
  targetLifecycleStages?: string;
  minRfmScore?: number;
  fromEmail?: string;
  fromName?: string;
  replyToEmail?: string;
  scheduledAt?: string;
  sentAt?: string;
  completedAt?: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  unsubscribedCount: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  createdAt: string;
}

export interface CreateCampaignDto {
  name: string;
  subject: string;
  previewText?: string;
  htmlContent: string;
  plainTextContent?: string;
  targetSegmentId?: string;
  targetLifecycleStages?: string;
  minRfmScore?: number;
  fromEmail?: string;
  fromName?: string;
  replyToEmail?: string;
}

// Dashboard
export interface CrmDashboard {
  totalCustomers: number;
  newCustomersThisMonth: number;
  activeCustomers: number;
  atRiskCustomers: number;
  churnedCustomers: number;
  vipCustomers: number;
  championCustomers: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalLeads: number;
  newLeadsThisMonth: number;
  qualifiedLeads: number;
  convertedLeadsThisMonth: number;
  leadConversionRate: number;
  totalPipelineValue: number;
  pendingTasks: number;
  overdueTasks: number;
}

export interface RfmDistribution {
  recencyDistribution: { score: number; count: number }[];
  frequencyDistribution: { score: number; count: number }[];
  monetaryDistribution: { score: number; count: number }[];
  lifecycleDistribution: { stage: LifecycleStage; stageName: string; count: number }[];
}

// Pipeline View
export interface PipelineView {
  stage: PipelineStage;
  leads: Lead[];
}

// Paged Result
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Query Params
export interface CustomerQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  lifecycleStage?: LifecycleStage;
  segmentId?: string;
  minRfmScore?: number;
  maxRfmScore?: number;
  sortBy?: string;
  sortDesc?: boolean;
}

export interface LeadQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: LeadStatus;
  source?: LeadSource;
  pipelineStageId?: string;
  assignedToUserId?: string;
  hasFollowUpToday?: boolean;
  sortBy?: string;
  sortDesc?: boolean;
}

export interface CampaignQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CampaignStatus;
  sortBy?: string;
  sortDesc?: boolean;
}

// ============================================
// CRM API Functions
// ============================================

export const crmApi = {
  // ============ Dashboard ============
  dashboard: {
    getOverview: async (): Promise<CrmDashboard> => {
      const response = await client.get<CrmDashboard>('/crm/dashboard/overview');
      return response.data;
    },

    getRfmDistribution: async (): Promise<RfmDistribution> => {
      const response = await client.get<RfmDistribution>('/crm/dashboard/rfm-distribution');
      return response.data;
    },
  },

  // ============ Customers ============
  customers: {
    getList: async (params: CustomerQueryParams = {}): Promise<PagedResult<CustomerAnalytics>> => {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.lifecycleStage) queryParams.append('lifecycleStage', params.lifecycleStage);
      if (params.segmentId) queryParams.append('segmentId', params.segmentId);
      if (params.minRfmScore) queryParams.append('minRfmScore', params.minRfmScore.toString());
      if (params.maxRfmScore) queryParams.append('maxRfmScore', params.maxRfmScore.toString());
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortDesc !== undefined) queryParams.append('sortDesc', params.sortDesc.toString());

      const response = await client.get<PagedResult<CustomerAnalytics>>(`/crm/customers?${queryParams.toString()}`);
      return response.data;
    },

    getById: async (id: string): Promise<CustomerDetail> => {
      const response = await client.get<CustomerDetail>(`/crm/customers/${id}`);
      return response.data;
    },

    addInteraction: async (customerId: string, data: CreateInteractionDto): Promise<Interaction> => {
      const response = await client.post<Interaction>(`/crm/customers/${customerId}/interactions`, data);
      return response.data;
    },

    assignToSegment: async (customerId: string, segmentId: string): Promise<void> => {
      await client.post(`/crm/customers/${customerId}/segments/${segmentId}`);
    },

    removeFromSegment: async (customerId: string, segmentId: string): Promise<void> => {
      await client.delete(`/crm/customers/${customerId}/segments/${segmentId}`);
    },
  },

  // ============ Segments ============
  segments: {
    getList: async (): Promise<Segment[]> => {
      const response = await client.get<Segment[]>('/crm/segments');
      return response.data;
    },

    getById: async (id: string): Promise<Segment> => {
      const response = await client.get<Segment>(`/crm/segments/${id}`);
      return response.data;
    },

    create: async (data: CreateSegmentDto): Promise<Segment> => {
      const response = await client.post<Segment>('/crm/segments', data);
      return response.data;
    },

    update: async (id: string, data: UpdateSegmentDto): Promise<Segment> => {
      const response = await client.put<Segment>(`/crm/segments/${id}`, data);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await client.delete(`/crm/segments/${id}`);
    },

    setRules: async (id: string, ruleDefinition: string): Promise<Segment> => {
      const response = await client.post<Segment>(`/crm/segments/${id}/rules`, { ruleDefinition });
      return response.data;
    },

    runAutoAssignment: async (): Promise<{ assignedCount: number }> => {
      const response = await client.post<{ assignedCount: number }>('/crm/segments/run-auto-assignment');
      return response.data;
    },
  },

  // ============ Leads ============
  leads: {
    getList: async (params: LeadQueryParams = {}): Promise<PagedResult<Lead>> => {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.source) queryParams.append('source', params.source);
      if (params.pipelineStageId) queryParams.append('pipelineStageId', params.pipelineStageId);
      if (params.assignedToUserId) queryParams.append('assignedToUserId', params.assignedToUserId);
      if (params.hasFollowUpToday !== undefined) queryParams.append('hasFollowUpToday', params.hasFollowUpToday.toString());
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortDesc !== undefined) queryParams.append('sortDesc', params.sortDesc.toString());

      const response = await client.get<PagedResult<Lead>>(`/crm/leads?${queryParams.toString()}`);
      return response.data;
    },

    getById: async (id: string): Promise<LeadDetail> => {
      const response = await client.get<LeadDetail>(`/crm/leads/${id}`);
      return response.data;
    },

    create: async (data: CreateLeadDto): Promise<Lead> => {
      const response = await client.post<Lead>('/crm/leads', data);
      return response.data;
    },

    update: async (id: string, data: UpdateLeadDto): Promise<Lead> => {
      const response = await client.put<Lead>(`/crm/leads/${id}`, data);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await client.delete(`/crm/leads/${id}`);
    },

    assign: async (id: string, userId: string, userName: string): Promise<void> => {
      await client.post(`/crm/leads/${id}/assign`, { userId, userName });
    },

    moveStage: async (id: string, stageId: string): Promise<void> => {
      await client.post(`/crm/leads/${id}/move-stage`, { stageId });
    },

    setFollowUp: async (id: string, followUpDate: string, note?: string): Promise<void> => {
      await client.post(`/crm/leads/${id}/follow-up`, { followUpDate, note });
    },

    convert: async (id: string, notes?: string): Promise<{ customerId: string }> => {
      const response = await client.post<{ customerId: string }>(`/crm/leads/${id}/convert`, { notes });
      return response.data;
    },

    markLost: async (id: string, reason: string): Promise<void> => {
      await client.post(`/crm/leads/${id}/mark-lost`, { reason });
    },

    addInteraction: async (id: string, data: CreateInteractionDto): Promise<Interaction> => {
      const response = await client.post<Interaction>(`/crm/leads/${id}/interactions`, data);
      return response.data;
    },

    getPipeline: async (): Promise<PipelineView[]> => {
      const response = await client.get<PipelineView[]>('/crm/leads/pipeline');
      return response.data;
    },

    getUpcomingFollowUps: async (days?: number): Promise<Lead[]> => {
      const response = await client.get<Lead[]>(`/crm/leads/upcoming-followups${days ? `?days=${days}` : ''}`);
      return response.data;
    },
  },

  // ============ Pipeline Stages ============
  pipelineStages: {
    getList: async (): Promise<PipelineStage[]> => {
      const response = await client.get<PipelineStage[]>('/crm/pipeline-stages');
      return response.data;
    },

    create: async (data: CreatePipelineStageDto): Promise<PipelineStage> => {
      const response = await client.post<PipelineStage>('/crm/pipeline-stages', data);
      return response.data;
    },

    update: async (id: string, data: CreatePipelineStageDto): Promise<PipelineStage> => {
      const response = await client.put<PipelineStage>(`/crm/pipeline-stages/${id}`, data);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await client.delete(`/crm/pipeline-stages/${id}`);
    },
  },

  // ============ Campaigns ============
  campaigns: {
    getList: async (params: CampaignQueryParams = {}): Promise<PagedResult<Campaign>> => {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortDesc !== undefined) queryParams.append('sortDesc', params.sortDesc.toString());

      const response = await client.get<PagedResult<Campaign>>(`/crm/campaigns?${queryParams.toString()}`);
      return response.data;
    },

    getById: async (id: string): Promise<CampaignDetail> => {
      const response = await client.get<CampaignDetail>(`/crm/campaigns/${id}`);
      return response.data;
    },

    create: async (data: CreateCampaignDto): Promise<Campaign> => {
      const response = await client.post<Campaign>('/crm/campaigns', data);
      return response.data;
    },

    update: async (id: string, data: CreateCampaignDto): Promise<Campaign> => {
      const response = await client.put<Campaign>(`/crm/campaigns/${id}`, data);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await client.delete(`/crm/campaigns/${id}`);
    },

    schedule: async (id: string, sendAt: string): Promise<void> => {
      await client.post(`/crm/campaigns/${id}/schedule`, { sendAt });
    },

    unschedule: async (id: string): Promise<void> => {
      await client.post(`/crm/campaigns/${id}/unschedule`);
    },

    send: async (id: string): Promise<void> => {
      await client.post(`/crm/campaigns/${id}/send`);
    },

    pause: async (id: string): Promise<void> => {
      await client.post(`/crm/campaigns/${id}/pause`);
    },

    resume: async (id: string): Promise<void> => {
      await client.post(`/crm/campaigns/${id}/resume`);
    },

    preview: async (id: string, customerAnalyticsId?: string): Promise<string> => {
      const response = await client.get<string>(`/crm/campaigns/${id}/preview${customerAnalyticsId ? `?customerAnalyticsId=${customerAnalyticsId}` : ''}`);
      return response.data;
    },
  },

  // ============ Tasks ============
  tasks: {
    getList: async (params: {
      customerId?: string;
      leadId?: string;
      assignedToUserId?: string;
      status?: TaskStatus;
      page?: number;
      pageSize?: number;
    } = {}): Promise<PagedResult<Task>> => {
      const queryParams = new URLSearchParams();
      if (params.customerId) queryParams.append('customerId', params.customerId);
      if (params.leadId) queryParams.append('leadId', params.leadId);
      if (params.assignedToUserId) queryParams.append('assignedToUserId', params.assignedToUserId);
      if (params.status) queryParams.append('status', params.status);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

      const response = await client.get<PagedResult<Task>>(`/crm/tasks?${queryParams.toString()}`);
      return response.data;
    },

    create: async (data: CreateTaskDto & { customerId?: string; leadId?: string }): Promise<Task> => {
      const queryParams = new URLSearchParams();
      if (data.customerId) queryParams.append('customerId', data.customerId);
      if (data.leadId) queryParams.append('leadId', data.leadId);

      const response = await client.post<Task>(`/crm/tasks?${queryParams.toString()}`, data);
      return response.data;
    },

    update: async (id: string, data: { title: string; description?: string; priority: TaskPriority; dueDate?: string }): Promise<Task> => {
      const response = await client.put<Task>(`/crm/tasks/${id}`, data);
      return response.data;
    },

    complete: async (id: string): Promise<void> => {
      await client.post(`/crm/tasks/${id}/complete`);
    },

    cancel: async (id: string): Promise<void> => {
      await client.post(`/crm/tasks/${id}/cancel`);
    },

    delete: async (id: string): Promise<void> => {
      await client.delete(`/crm/tasks/${id}`);
    },
  },
};

// ============================================
// Helper Functions
// ============================================

// Get lifecycle stage color
export const getLifecycleStageColor = (stage: LifecycleStage): string => {
  const colors: Record<LifecycleStage, string> = {
    New: 'bg-gray-100 text-gray-800',
    Active: 'bg-green-100 text-green-800',
    AtRisk: 'bg-yellow-100 text-yellow-800',
    Churned: 'bg-red-100 text-red-800',
    VIP: 'bg-purple-100 text-purple-800',
    Champion: 'bg-blue-100 text-blue-800',
  };
  return colors[stage] || 'bg-gray-100 text-gray-800';
};

// Get lead status color
export const getLeadStatusColor = (status: LeadStatus): string => {
  const colors: Record<LeadStatus, string> = {
    New: 'bg-gray-100 text-gray-800',
    Contacted: 'bg-blue-100 text-blue-800',
    Qualified: 'bg-indigo-100 text-indigo-800',
    Proposal: 'bg-purple-100 text-purple-800',
    Negotiation: 'bg-orange-100 text-orange-800',
    Won: 'bg-green-100 text-green-800',
    Lost: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

// Get RFM score color
export const getRfmScoreColor = (score: number): string => {
  if (score >= 12) return 'text-green-600';
  if (score >= 9) return 'text-blue-600';
  if (score >= 6) return 'text-yellow-600';
  return 'text-red-600';
};

// Get task priority color
export const getTaskPriorityColor = (priority: TaskPriority): string => {
  const colors: Record<TaskPriority, string> = {
    Low: 'bg-gray-100 text-gray-800',
    Medium: 'bg-blue-100 text-blue-800',
    High: 'bg-orange-100 text-orange-800',
    Urgent: 'bg-red-100 text-red-800',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
};

// Get campaign status color
export const getCampaignStatusColor = (status: CampaignStatus): string => {
  const colors: Record<CampaignStatus, string> = {
    Draft: 'bg-gray-100 text-gray-800',
    Scheduled: 'bg-blue-100 text-blue-800',
    Sending: 'bg-yellow-100 text-yellow-800',
    Sent: 'bg-green-100 text-green-800',
    Paused: 'bg-orange-100 text-orange-800',
    Cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

// Format currency (VND)
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

// Format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// Format datetime
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Get interaction type icon name
export const getInteractionTypeIcon = (type: InteractionType): string => {
  const icons: Record<InteractionType, string> = {
    Note: 'FileText',
    Call: 'Phone',
    Email: 'Mail',
    Meeting: 'Calendar',
    Task: 'CheckSquare',
    SMS: 'MessageSquare',
    Chat: 'MessageCircle',
    SocialMedia: 'Share2',
  };
  return icons[type] || 'FileText';
};
