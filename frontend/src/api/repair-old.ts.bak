import client from './client';

// Types
export interface WorkOrder {
    id: string;
    ticketNumber: string;
    customerId: string;
    deviceModel: string;
    serialNumber: string;
    description: string;
    status: WorkOrderStatus;
    technicianId?: string;
    estimatedCost: number;
    actualCost: number;
    partsCost: number;
    laborCost: number;
    totalCost: number;
    technicalNotes?: string;
    createdAt: string;
    startedAt?: string;
    finishedAt?: string;
}

export type WorkOrderStatus = 'Pending' | 'Assigned' | 'InProgress' | 'OnHold' | 'Completed' | 'Cancelled';

export interface WorkOrdersResponse {
    total: number;
    page: number;
    pageSize: number;
    workOrders: WorkOrder[];
}

export interface RepairStats {
    totalWorkOrders: number;
    todayWorkOrders: number;
    monthWorkOrders: number;
    pendingWorkOrders: number;
    inProgressWorkOrders: number;
    completedWorkOrders: number;
    totalRevenue: number;
}

export interface Technician {
    id: string;
    name: string;
    email: string;
    specialization: string;
    isAvailable: boolean;
    activeWorkOrders?: number;
}

// API Functions
export const repairApi = {
    // Customer Endpoints
    createWorkOrder: async (data: { deviceModel: string, serialNumber: string, description: string }) => {
        const response = await client.post<{
            id: string;
            ticketNumber: string;
            status: string;
            description: string;
            message: string;
        }>('/repair/work-orders', data);
        return response.data;
    },

    getMyWorkOrders: async () => {
        const response = await client.get<WorkOrder[]>('/repair/work-orders');
        return response.data;
    },

    getMyWorkOrder: async (id: string) => {
        const response = await client.get<WorkOrder>(`/repair/work-orders/${id}`);
        return response.data;
    },

    // Admin Endpoints
    admin: {
        getWorkOrders: async (page = 1, pageSize = 20, status?: string) => {
            const response = await client.get<WorkOrdersResponse>('/repair/admin/work-orders', {
                params: { page, pageSize, status },
            });
            return response.data;
        },

        getWorkOrder: async (id: string) => {
            const response = await client.get<WorkOrder>(`/repair/admin/work-orders/${id}`);
            return response.data;
        },

        assignTechnician: async (id: string, technicianId: string) => {
            const response = await client.put<{ message: string; status: string }>(
                `/repair/admin/work-orders/${id}/assign`,
                { technicianId }
            );
            return response.data;
        },

        startRepair: async (id: string) => {
            const response = await client.put<{ message: string; status: string }>(
                `/repair/admin/work-orders/${id}/start`
            );
            return response.data;
        },

        completeRepair: async (id: string, data: { partsCost: number; laborCost: number; notes?: string }) => {
            const response = await client.put<{ message: string; status: string; totalCost: number }>(
                `/repair/admin/work-orders/${id}/complete`,
                data
            );
            return response.data;
        },

        cancelWorkOrder: async (id: string, reason: string) => {
            const response = await client.put<{ message: string; status: string }>(
                `/repair/admin/work-orders/${id}/cancel`,
                { reason }
            );
            return response.data;
        },

        getStats: async () => {
            const response = await client.get<RepairStats>('/repair/admin/stats');
            return response.data;
        },

        getTechnicians: async () => {
            const response = await client.get<Technician[]>('/repair/admin/technicians');
            return response.data;
        },

        createTechnician: async (data: { name: string; email: string; specialization: string }) => {
            const response = await client.post<{ message: string; technicianId: string }>(
                '/repair/admin/technicians',
                data
            );
            return response.data;
        },
    },
};
