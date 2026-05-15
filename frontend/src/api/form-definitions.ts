import client from './client';

export interface FieldSchemaItem {
    type: 'section' | 'field';
    // for type === 'section'
    title?: string;
    // for type === 'field'
    source?: 'entity' | 'custom';
    fieldName?: string;
    width?: 'full' | 'half';
}

export interface FormDefinition {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    entityType?: string | null;
    fieldsSchema: string; // JSON string — parse with parseFieldsSchema()
    isActive: boolean;
    createdAt: string;
    updatedAt?: string | null;
}

export interface CreateFormDefinitionDto {
    code: string;
    name: string;
    description?: string | null;
    entityType?: string | null;
    fieldsSchema?: string;
}

export interface UpdateFormDefinitionDto {
    name?: string;
    description?: string | null;
    entityType?: string | null;
    fieldsSchema?: string;
    isActive?: boolean;
}

export function parseFieldsSchema(json: string): FieldSchemaItem[] {
    try {
        const parsed = JSON.parse(json);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export const formDefinitionsApi = {
    list: async (entityType?: string, activeOnly = true): Promise<FormDefinition[]> => {
        const params: Record<string, string | boolean> = { activeOnly };
        if (entityType) params.entityType = entityType;
        const { data } = await client.get<FormDefinition[]>('/config/forms', { params });
        return data;
    },

    getById: async (id: string): Promise<FormDefinition> => {
        const { data } = await client.get<FormDefinition>(`/config/forms/${id}`);
        return data;
    },

    create: async (dto: CreateFormDefinitionDto): Promise<FormDefinition> => {
        const { data } = await client.post<FormDefinition>('/config/forms', dto);
        return data;
    },

    update: async (id: string, dto: UpdateFormDefinitionDto): Promise<FormDefinition> => {
        const { data } = await client.put<FormDefinition>(`/config/forms/${id}`, dto);
        return data;
    },

    remove: async (id: string): Promise<void> => {
        await client.delete(`/config/forms/${id}`);
    },
};
