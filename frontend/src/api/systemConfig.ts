
import client from './client';

// ============================================
// System Config API Types
// ============================================

export type ConfigValueType = 'String' | 'Number' | 'Boolean' | 'Json' | 'Secret' | 'Url' | 'Email' | 'Percentage';

export interface ConfigurationEntry {
    key: string;
    value: string;
    description: string;
    category: string;
    module: string;
    valueType: ConfigValueType;
    jsonValue?: string | null;
    isSystem: boolean;
    sortOrder: number;
    lastUpdated: string;
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
// Backoffice Menu Types
// ============================================

export interface BackofficeMenuItemDto {
    id: string;
    groupId: string;
    title: string;
    description?: string;
    iconName: string;
    path: string;
    allowedRoles: string[];
    displayOrder: number;
    isActive: boolean;
    badgeSource?: string;
    openInNewTab: boolean;
}

export interface BackofficeMenuGroupDto {
    id: string;
    title: string;
    iconName: string;
    colorClass: string;
    displayOrder: number;
    isActive: boolean;
    items: BackofficeMenuItemDto[];
}

export interface CreateMenuGroupRequest {
    title: string;
    iconName?: string;
    colorClass?: string;
    isActive?: boolean;
}

export interface UpdateMenuGroupRequest {
    title?: string;
    iconName?: string;
    colorClass?: string;
    isActive?: boolean;
}

export interface CreateMenuItemRequest {
    groupId: string;
    title: string;
    path: string;
    description?: string;
    iconName?: string;
    allowedRoles?: string[];
    isActive?: boolean;
    badgeSource?: string;
    openInNewTab?: boolean;
}

export interface UpdateMenuItemRequest {
    title?: string;
    path?: string;
    description?: string;
    iconName?: string;
    allowedRoles?: string[];
    isActive?: boolean;
    badgeSource?: string;
    openInNewTab?: boolean;
}

export interface ReorderRequest {
    id: string;
    order: number;
    groupId?: string;
}

// ============================================
// System Config API Functions
// ============================================

export const systemConfigApi = {
    // ============ Configuration ============
    config: {
        getPublic: async (): Promise<ConfigurationEntry[]> => {
            const response = await client.get('/config/public');
            return response.data;
        },

        getAll: async (category?: string, module?: string): Promise<ConfigurationEntry[]> => {
            const response = await client.get('/config', { params: { category, module } });
            return response.data;
        },

        getModules: async (): Promise<string[]> => {
            const response = await client.get('/config/modules');
            return response.data;
        },

        getByKey: async (key: string): Promise<ConfigurationEntry> => {
            const response = await client.get(`/config/${key}`);
            return response.data;
        },

        upsert: async (entry: ConfigurationEntry): Promise<ConfigurationEntry> => {
            const response = await client.post('/config', entry);
            return response.data;
        },

        upsertByKey: async (key: string, entry: ConfigurationEntry): Promise<ConfigurationEntry> => {
            const response = await client.post(`/config/${key}`, entry);
            return response.data;
        },

        delete: async (key: string): Promise<void> => {
            await client.delete(`/config/${key}`);
        },
    },

    // ============ Backoffice Menu ============
    backofficeMenu: {
        getForUser: async (): Promise<BackofficeMenuGroupDto[]> => {
            const response = await client.get('/config/backoffice-menu');
            return response.data;
        },

        admin: {
            getAll: async (): Promise<BackofficeMenuGroupDto[]> => {
                const response = await client.get('/config/admin/backoffice-menu');
                return response.data;
            },

            createGroup: async (data: CreateMenuGroupRequest): Promise<BackofficeMenuGroupDto> => {
                const response = await client.post('/config/admin/backoffice-menu/groups', data);
                return response.data;
            },

            updateGroup: async (id: string, data: UpdateMenuGroupRequest): Promise<BackofficeMenuGroupDto> => {
                const response = await client.put(`/config/admin/backoffice-menu/groups/${id}`, data);
                return response.data;
            },

            deleteGroup: async (id: string): Promise<void> => {
                await client.delete(`/config/admin/backoffice-menu/groups/${id}`);
            },

            reorderGroups: async (items: ReorderRequest[]): Promise<void> => {
                await client.put('/config/admin/backoffice-menu/groups/reorder', items);
            },

            createItem: async (data: CreateMenuItemRequest): Promise<BackofficeMenuItemDto> => {
                const response = await client.post('/config/admin/backoffice-menu/items', data);
                return response.data;
            },

            updateItem: async (id: string, data: UpdateMenuItemRequest): Promise<BackofficeMenuItemDto> => {
                const response = await client.put(`/config/admin/backoffice-menu/items/${id}`, data);
                return response.data;
            },

            deleteItem: async (id: string): Promise<void> => {
                await client.delete(`/config/admin/backoffice-menu/items/${id}`);
            },

            reorderItems: async (items: ReorderRequest[]): Promise<void> => {
                await client.put('/config/admin/backoffice-menu/items/reorder', items);
            },
        },
    },

    // ============ Convenience Methods (used by ConfigPortal) ============
    getConfigs: async (category?: string): Promise<ConfigurationEntry[]> => {
        return systemConfigApi.config.getAll(category);
    },

    updateConfigs: async (configs: ConfigurationEntry[]): Promise<void> => {
        // Batch update all configs
        await Promise.all(
            configs.map(config => systemConfigApi.config.upsert(config))
        );
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
    const config = configs.find(c => c.key === key);
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
