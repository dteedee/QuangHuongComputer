import client from './client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ColumnDef {
    key: string;
    label: string;
    type: 'string' | 'number' | 'currency' | 'date' | 'enum';
    defaultVisible: boolean;
}

export interface FilterDef {
    key: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'enum';
    options?: string[];
}

export interface ReportDefinition {
    id: string;
    code: string;
    name: string;
    description?: string;
    category: string;
    dataSourceEndpoint: string;
    availableColumns: string; // raw JSON string from API
    availableFilters: string; // raw JSON string from API
    defaultSortColumn?: string;
    defaultSortDirection: string;
    displayOrder: number;
}

export interface ReportPreset {
    id: string;
    name: string;
    visibleColumns: string;  // JSON string — array of column keys
    columnOrder: string;     // JSON string — ordered array of column keys
    filterValues: string;    // JSON string — object of filter values
    sortColumn?: string;
    sortDirection?: string;
    isDefault: boolean;
    isShared: boolean;
    createdAt: string;
    updatedAt: string;
    isOwn: boolean;
}

export interface SavePresetPayload {
    name: string;
    visibleColumns?: string;
    columnOrder?: string;
    filterValues?: string;
    sortColumn?: string;
    sortDirection?: string;
    isDefault: boolean;
    isShared: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const parseColumns = (json: string): ColumnDef[] => {
    try { return JSON.parse(json); } catch { return []; }
};

export const parseFilters = (json: string): FilterDef[] => {
    try { return JSON.parse(json); } catch { return []; }
};

export const parseVisibleColumns = (json: string): string[] => {
    try { return JSON.parse(json); } catch { return []; }
};

// ── API calls ─────────────────────────────────────────────────────────────────

export const reportCustomizationApi = {
    listDefinitions: (): Promise<ReportDefinition[]> =>
        client.get('/reports/definitions').then(r => r.data),

    getDefinition: (code: string): Promise<ReportDefinition> =>
        client.get(`/reports/definitions/${code}`).then(r => r.data),

    listPresets: (code: string): Promise<ReportPreset[]> =>
        client.get(`/reports/${code}/presets`).then(r => r.data),

    savePreset: (code: string, payload: SavePresetPayload): Promise<{ id: string }> =>
        client.post(`/reports/${code}/presets`, payload).then(r => r.data),

    updatePreset: (code: string, id: string, payload: SavePresetPayload): Promise<{ id: string }> =>
        client.put(`/reports/${code}/presets/${id}`, payload).then(r => r.data),

    deletePreset: (code: string, id: string): Promise<void> =>
        client.delete(`/reports/${code}/presets/${id}`).then(() => undefined),
};
