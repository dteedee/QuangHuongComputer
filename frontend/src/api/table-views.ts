import client from './client';

export type ColumnType = 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'badge' | 'image';

export interface TableColumnDef {
    key: string;
    label: string;
    type: ColumnType;
    sortable?: boolean;
    visible?: boolean;
    width?: number;
    format?: string;
}

export interface TableFilterDef {
    key: string;
    label: string;
    type: 'select' | 'text' | 'date' | 'number';
    options?: string[];
}

export interface TableViewDefinition {
    id: string;
    key: string;
    name: string;
    columnsJson: string;
    filtersJson?: string | null;
    isSystem: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string | null;
}

export interface CreateTableViewDto {
    key: string;
    name: string;
    columnsJson: string;
    filtersJson?: string | null;
}

export interface UpdateTableViewDto {
    name?: string;
    columnsJson?: string;
    filtersJson?: string | null;
    isActive?: boolean;
}

export const tableViewsApi = {
    list: async (activeOnly = true): Promise<TableViewDefinition[]> => {
        const { data } = await client.get<TableViewDefinition[]>('/config/table-views', { params: { activeOnly } });
        return data;
    },

    getByKey: async (key: string): Promise<TableViewDefinition> => {
        const { data } = await client.get<TableViewDefinition>(`/config/table-views/by-key/${key}`);
        return data;
    },

    getById: async (id: string): Promise<TableViewDefinition> => {
        const { data } = await client.get<TableViewDefinition>(`/config/table-views/${id}`);
        return data;
    },

    create: async (dto: CreateTableViewDto): Promise<TableViewDefinition> => {
        const { data } = await client.post<TableViewDefinition>('/config/table-views', dto);
        return data;
    },

    update: async (id: string, dto: UpdateTableViewDto): Promise<TableViewDefinition> => {
        const { data } = await client.put<TableViewDefinition>(`/config/table-views/${id}`, dto);
        return data;
    },

    remove: async (id: string): Promise<void> => {
        await client.delete(`/config/table-views/${id}`);
    },
};

/** Parse columns JSON safely, falling back to an empty array. */
export function parseColumns(columnsJson: string): TableColumnDef[] {
    try {
        const parsed = JSON.parse(columnsJson);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}
