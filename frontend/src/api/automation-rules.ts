import client from './client';

export type TriggerEvent = 'created' | 'updated' | 'status_changed' | 'field_changed';
export type ActionType = 'send_notification' | 'create_entity' | 'update_field' | 'send_email';

export const TRIGGER_EVENTS: { value: TriggerEvent; label: string }[] = [
    { value: 'created', label: 'Record Created' },
    { value: 'updated', label: 'Record Updated' },
    { value: 'status_changed', label: 'Status Changed' },
    { value: 'field_changed', label: 'Field Changed' },
];

export const ACTION_TYPES: { value: ActionType; label: string }[] = [
    { value: 'send_notification', label: 'Send Notification' },
    { value: 'create_entity', label: 'Create Entity' },
    { value: 'update_field', label: 'Update Field' },
    { value: 'send_email', label: 'Send Email' },
];

export interface AutomationRule {
    id: string;
    name: string;
    entityType: string;
    triggerEvent: TriggerEvent;
    triggerField?: string | null;
    conditionJson: string; // JSON: { field, operator, value }
    actionType: ActionType;
    actionConfig: string; // JSON: action-specific config
    isActive: boolean;
    executionOrder: number;
    createdAt: string;
}

export interface CreateAutomationRuleDto {
    name: string;
    entityType: string;
    triggerEvent: TriggerEvent;
    actionType: ActionType;
    triggerField?: string | null;
    conditionJson?: string;
    actionConfig?: string;
    executionOrder?: number;
}

export interface UpdateAutomationRuleDto {
    name?: string;
    entityType?: string;
    triggerEvent?: TriggerEvent;
    triggerField?: string | null;
    conditionJson?: string;
    actionType?: ActionType;
    actionConfig?: string;
    executionOrder?: number;
    isActive?: boolean;
}

export const automationRulesApi = {
    list: async (entityType?: string, activeOnly = true): Promise<AutomationRule[]> => {
        const params: Record<string, string | boolean> = { activeOnly };
        if (entityType) params.entityType = entityType;
        const { data } = await client.get<AutomationRule[]>('/config/automation-rules', { params });
        return data;
    },

    getById: async (id: string): Promise<AutomationRule> => {
        const { data } = await client.get<AutomationRule>(`/config/automation-rules/${id}`);
        return data;
    },

    create: async (dto: CreateAutomationRuleDto): Promise<AutomationRule> => {
        const { data } = await client.post<AutomationRule>('/config/automation-rules', dto);
        return data;
    },

    update: async (id: string, dto: UpdateAutomationRuleDto): Promise<AutomationRule> => {
        const { data } = await client.put<AutomationRule>(`/config/automation-rules/${id}`, dto);
        return data;
    },

    remove: async (id: string): Promise<void> => {
        await client.delete(`/config/automation-rules/${id}`);
    },
};
