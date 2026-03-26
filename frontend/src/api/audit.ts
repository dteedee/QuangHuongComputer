import client from './client';

// ============================================
// Audit Log Types
// ============================================

export interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  entityName: string;
  entityId: string;
  details: string;
  module?: string;
  oldValues?: string;
  newValues?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
}

export interface AuditLogStats {
  totalLogs: number;
  todayLogs: number;
  weekLogs: number;
  monthLogs: number;
  actionStats: { action: string; count: number }[];
  moduleStats: { module: string; count: number }[];
  entityStats: { entity: string; count: number }[];
  userStats: { userId: string; userName: string; count: number }[];
  dailyActivity: { date: string; count: number }[];
}

export interface AuditLogFilters {
  actions: string[];
  entityNames: string[];
  modules: string[];
}

export interface AuditLogPagedResult {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface AuditLogQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  action?: string;
  entityName?: string;
  module?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDescending?: boolean;
}

// ============================================
// Backup Types
// ============================================

export interface BackupInfo {
  fileName: string;
  baseName: string;
  sizeDump: string;
  sizeDumpBytes: number;
  sizeSqlGz?: string;
  hasSqlGz: boolean;
  createdAt: string;
  lastModified: string;
  metadata?: string;
}

export interface BackupListResult {
  backups: BackupInfo[];
  totalSize: string;
  totalSizeBytes: number;
  count: number;
}

export interface BackupStats {
  totalBackups: number;
  totalSize: string;
  totalSizeBytes: number;
  oldestBackup?: string;
  newestBackup?: string;
  backupDirectory: string;
}

// ============================================
// Audit Log API
// ============================================

export const auditApi = {
  // Get paged audit logs
  getLogs: async (params: AuditLogQueryParams): Promise<AuditLogPagedResult> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.action) queryParams.append('action', params.action);
    if (params.entityName) queryParams.append('entityName', params.entityName);
    if (params.module) queryParams.append('module', params.module);
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDescending !== undefined) queryParams.append('sortDescending', params.sortDescending.toString());

    const response = await client.get<AuditLogPagedResult>(`/audit-logs?${queryParams.toString()}`);
    return response.data;
  },

  // Get single audit log detail
  getDetail: async (id: string): Promise<AuditLog> => {
    const response = await client.get<AuditLog>(`/audit-logs/${id}`);
    return response.data;
  },

  // Get audit log stats
  getStats: async (): Promise<AuditLogStats> => {
    const response = await client.get<AuditLogStats>('/audit-logs/stats');
    return response.data;
  },

  // Get filter options
  getFilters: async (): Promise<AuditLogFilters> => {
    const response = await client.get<AuditLogFilters>('/audit-logs/filters');
    return response.data;
  },

  // Export CSV
  exportCsv: async (params: Partial<AuditLogQueryParams> = {}): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    if (params.action) queryParams.append('action', params.action);
    if (params.entityName) queryParams.append('entityName', params.entityName);
    if (params.module) queryParams.append('module', params.module);
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);

    const response = await client.get(`/audit-logs/export?${queryParams.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Cleanup old logs
  cleanup: async (daysToKeep?: number): Promise<{ deletedCount: number; cutoffDate: string; daysKept: number }> => {
    const queryParams = daysToKeep ? `?daysToKeep=${daysToKeep}` : '';
    const response = await client.delete(`/audit-logs/cleanup${queryParams}`);
    return response.data;
  }
};

// ============================================
// Backup API
// ============================================

export const backupApi = {
  // List backups
  list: async (): Promise<BackupListResult> => {
    const response = await client.get<BackupListResult>('/system/backups');
    return response.data;
  },

  // Create manual backup
  create: async (): Promise<{ message: string; output: string; exitCode: number }> => {
    const response = await client.post('/system/backups');
    return response.data;
  },

  // Download backup
  download: async (fileName: string): Promise<Blob> => {
    const response = await client.get(`/system/backups/download/${fileName}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Delete backup
  delete: async (baseName: string): Promise<{ message: string; deletedFiles: string[] }> => {
    const response = await client.delete(`/system/backups/${baseName}`);
    return response.data;
  },

  // Get backup stats
  getStats: async (): Promise<BackupStats> => {
    const response = await client.get<BackupStats>('/system/backups/stats');
    return response.data;
  }
};
