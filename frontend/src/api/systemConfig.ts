
import client from './client';

// ============================================
// System Config API Types
// ============================================

export interface ConfigurationEntry {
    id: string;
    key: string;
    value: string;
    description?: string;
    category?: string;
    isEncrypted: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateConfigRequest {
    key: string;
    value: string;
    description?: string;
    category?: string;
    isEncrypted?: boolean;
}

export interface UpdateConfigRequest {
    value?: string;
    description?: string;
    category?: string;
    isActive?: boolean;
}

export interface ConfigCategory {
    name: string;
    description?: string;
    count: number;
}

export interface SystemInfo {
    version: string;
    environment: string;
    uptime: string;
    memoryUsage: number;
    totalMemory: number;
    cpuUsage: number;
    activeConnections: number;
}

export interface AuditLog {
    id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: string;
    newValue?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
}

export interface PagedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// ============================================
// System Config API Functions
// ============================================

export const systemConfigApi = {
    // ============ Configuration ============
    config: {
        getAll: async (): Promise<ConfigurationEntry[]> => {
            const response = await client.get('/system-config');
            return response.data;
        },

        getByKey: async (key: string): Promise<ConfigurationEntry> => {
            const response = await client.get(`/system-config/${key}`);
            return response.data;
        },

        getByCategory: async (category: string): Promise<ConfigurationEntry[]> => {
            const response = await client.get(`/system-config/category/${category}`);
            return response.data;
        },

        getCategories: async (): Promise<ConfigCategory[]> => {
            const response = await client.get('/system-config/categories');
            return response.data;
        },

        create: async (data: CreateConfigRequest): Promise<ConfigurationEntry> => {
            const response = await client.post('/system-config', data);
            return response.data;
        },

        update: async (key: string, data: UpdateConfigRequest): Promise<ConfigurationEntry> => {
            const response = await client.put(`/system-config/${key}`, data);
            return response.data;
        },

        delete: async (key: string): Promise<void> => {
            await client.delete(`/system-config/${key}`);
        },

        toggleActive: async (key: string): Promise<ConfigurationEntry> => {
            const response = await client.put(`/system-config/${key}/toggle-active`);
            return response.data;
        },
    },

    // ============ System Info ============
    system: {
        getInfo: async (): Promise<SystemInfo> => {
            const response = await client.get('/system-config/system/info');
            return response.data;
        },

        getHealth: async (): Promise<{
            status: 'healthy' | 'degraded' | 'unhealthy';
            checks: Record<string, { status: string; message?: string; duration?: number }>;
        }> => {
            const response = await client.get('/system-config/system/health');
            return response.data;
        },
    },

    // ============ Audit Logs ============
    audit: {
        getLogs: async (params: {
            page?: number;
            pageSize?: number;
            userId?: string;
            action?: string;
            entityType?: string;
            startDate?: string;
            endDate?: string;
        } = {}): Promise<PagedResult<AuditLog>> => {
            const response = await client.get('/system-config/audit', { params });
            return response.data;
        },

        getLogById: async (id: string): Promise<AuditLog> => {
            const response = await client.get(`/system-config/audit/${id}`);
            return response.data;
        },
    },
};

// ============================================
// Helper Functions
// ============================================

// Get config value by key with type safety
export const getConfigValue = <T>(
    configs: ConfigurationEntry[],
    key: string,
    defaultValue: T,
    parser: (value: string) => T
): T => {
    const config = configs.find(c => c.key === key && c.isActive);
    if (!config) return defaultValue;
    try {
        return parser(config.value);
    } catch {
        return defaultValue;
    }
};

// Common config parsers
export const configParsers = {
    string: (value: string): string => value,
    number: (value: string): number => parseFloat(value),
    boolean: (value: string): boolean => value.toLowerCase() === 'true',
    json: <T>(value: string): T => JSON.parse(value),
};

// Get system status color
export const getSystemStatusColor = (status: 'healthy' | 'degraded' | 'unhealthy'): string => {
    const colors = {
        healthy: 'bg-green-100 text-green-800',
        degraded: 'bg-yellow-100 text-yellow-800',
        unhealthy: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};

// Get system status label
export const getSystemStatusLabel = (status: 'healthy' | 'degraded' | 'unhealthy'): string => {
    const labels = {
        healthy: 'Hoạt động tốt',
        degraded: 'Hoạt động giảm',
        unhealthy: 'Gặp sự cố',
    };
    return labels[status] || status;
};
