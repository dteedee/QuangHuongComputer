import client from './client';

export type FieldType = 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'url' | 'email';
export type EntityType = 'Product' | 'Customer' | 'Order' | 'Lead' | 'RepairJob';

export interface CustomFieldDefinition {
    id: string;
    entityType: EntityType;
    fieldKey: string;
    label: string;
    fieldType: FieldType;
    optionsJson?: string | null;
    defaultValue?: string | null;
    isRequired: boolean;
    isVisibleInList: boolean;
    isFilterable: boolean;
    isPublic: boolean;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string | null;
}

export interface CreateCustomFieldDto {
    entityType: EntityType;
    fieldKey: string;
    label: string;
    fieldType: FieldType;
    optionsJson?: string | null;
    defaultValue?: string | null;
    isRequired?: boolean;
    isVisibleInList?: boolean;
    isFilterable?: boolean;
    isPublic?: boolean;
    displayOrder?: number;
}

export interface UpdateCustomFieldDto {
    label?: string;
    fieldType?: FieldType;
    optionsJson?: string | null;
    defaultValue?: string | null;
    isRequired?: boolean;
    isVisibleInList?: boolean;
    isFilterable?: boolean;
    isPublic?: boolean;
    displayOrder?: number;
    isActive?: boolean;
}

export interface ReorderCustomFieldDto {
    id: string;
    displayOrder: number;
}

export const ENTITY_TYPES: EntityType[] = ['Product', 'Customer', 'Order', 'Lead', 'RepairJob'];

export const FIELD_TYPES: { value: FieldType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Yes/No' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Dropdown' },
    { value: 'multiselect', label: 'Multi-select' },
    { value: 'url', label: 'URL' },
    { value: 'email', label: 'Email' },
];

export const customFieldsApi = {
    getEntityTypes: async (): Promise<EntityType[]> => {
        const { data } = await client.get<EntityType[]>('/config/custom-fields/entity-types');
        return data;
    },

    list: async (entityType?: EntityType, activeOnly = true): Promise<CustomFieldDefinition[]> => {
        const params: Record<string, string | boolean> = { activeOnly };
        if (entityType) params.entityType = entityType;
        const { data } = await client.get<CustomFieldDefinition[]>('/config/custom-fields', { params });
        return data;
    },

    getById: async (id: string): Promise<CustomFieldDefinition> => {
        const { data } = await client.get<CustomFieldDefinition>(`/config/custom-fields/${id}`);
        return data;
    },

    create: async (dto: CreateCustomFieldDto): Promise<CustomFieldDefinition> => {
        const { data } = await client.post<CustomFieldDefinition>('/config/custom-fields', dto);
        return data;
    },

    update: async (id: string, dto: UpdateCustomFieldDto): Promise<CustomFieldDefinition> => {
        const { data } = await client.put<CustomFieldDefinition>(`/config/custom-fields/${id}`, dto);
        return data;
    },

    remove: async (id: string): Promise<void> => {
        await client.delete(`/config/custom-fields/${id}`);
    },

    reorder: async (items: ReorderCustomFieldDto[]): Promise<void> => {
        await client.put('/config/custom-fields/reorder', items);
    },
};
