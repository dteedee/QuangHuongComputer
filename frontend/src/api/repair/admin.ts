/**
 * Repair — STAFF surface: technician (quote update, work-order status/parts/
 * log) + admin (booking approval, work-order assignment, technician roster,
 * stats). Split out of the old flat `api/repair.ts` (W1-9, step 7c).
 * Functions moved verbatim; `api/repair.ts` re-exports them. (Technicians are
 * staff, not customers — the spec's `{public,admin,types}` split treats
 * `technician` as part of the admin surface.)
 */
import client from '../client';
import type { BookingStatus, WorkOrderStatus } from './types';

export const repairAdminApi = {
    // Technician-only quote actions (customer approve/reject live in public.ts).
    quotes: {
        update: async (id: string, updates: {
            partsCost?: number;
            laborCost?: number;
            serviceFee?: number;
        }): Promise<{ message: string; totalCost: number }> => {
            const response = await client.put(`/repair/quotes/${id}`, updates);
            return response.data;
        },

        markAwaitingApproval: async (id: string): Promise<{
            message: string;
            workOrderStatus: WorkOrderStatus;
        }> => {
            const response = await client.put(`/repair/quotes/${id}/await-approval`);
            return response.data;
        },
    },

    technician: {
        getMyWorkOrders: async (page = 1, pageSize = 20): Promise<{
            total: number;
            page: number;
            pageSize: number;
            workOrders: any[];
        }> => {
            const response = await client.get('/repair/tech/work-orders', { params: { page, pageSize } });
            return response.data;
        },

        getUnassignedWorkOrders: async (): Promise<any[]> => {
            const response = await client.get('/repair/tech/work-orders/unassigned');
            return response.data;
        },

        getWorkOrderDetail: async (id: string): Promise<any> => {
            const response = await client.get(`/repair/tech/work-orders/${id}`);
            return response.data;
        },

        acceptAssignment: async (id: string): Promise<{ message: string; status: WorkOrderStatus }> => {
            const response = await client.put(`/repair/tech/work-orders/${id}/accept`);
            return response.data;
        },

        declineAssignment: async (id: string, reason: string): Promise<{ message: string; status: WorkOrderStatus }> => {
            const response = await client.put(`/repair/tech/work-orders/${id}/decline`, { reason });
            return response.data;
        },

        updateStatus: async (id: string, status: WorkOrderStatus, notes?: string): Promise<{ message: string; status: WorkOrderStatus }> => {
            const response = await client.put(`/repair/tech/work-orders/${id}/status`, { status, notes });
            return response.data;
        },

        addPart: async (id: string, part: {
            inventoryItemId: string;
            partName: string;
            quantity: number;
            unitPrice: number;
            partNumber?: string;
        }): Promise<{ message: string; partId: string; totalPartsCost: number }> => {
            const response = await client.post(`/repair/tech/work-orders/${id}/parts`, part);
            return response.data;
        },

        removePart: async (workOrderId: string, partId: string): Promise<{ message: string; totalPartsCost: number }> => {
            const response = await client.delete(`/repair/tech/work-orders/${workOrderId}/parts/${partId}`);
            return response.data;
        },

        addLog: async (id: string, note: string): Promise<{ message: string }> => {
            const response = await client.post(`/repair/tech/work-orders/${id}/log`, { note });
            return response.data;
        },

        createQuote: async (id: string, quote: {
            partsCost: number;
            laborCost: number;
            serviceFee: number;
            estimatedHours: number;
            hourlyRate: number;
            description?: string;
            notes?: string;
        }): Promise<{
            message: string;
            quoteId: string;
            quoteNumber: string;
            totalCost: number;
            validUntil: string;
        }> => {
            const response = await client.post(`/repair/work-orders/${id}/quote`, quote);
            return response.data;
        },
    },

    admin: {
        // Bookings
        getAllBookings: async (page = 1, pageSize = 20, status?: string): Promise<{
            total: number;
            page: number;
            pageSize: number;
            bookings: any[];
        }> => {
            const response = await client.get('/repair/admin/bookings', { params: { page, pageSize, status } });
            return response.data;
        },

        getBooking: async (id: string): Promise<any> => {
            const response = await client.get(`/repair/admin/bookings/${id}`);
            return response.data;
        },

        approveBooking: async (id: string): Promise<{ message: string; status: BookingStatus }> => {
            const response = await client.put(`/repair/admin/bookings/${id}/approve`);
            return response.data;
        },

        rejectBooking: async (id: string, reason: string): Promise<{ message: string; status: BookingStatus }> => {
            const response = await client.put(`/repair/admin/bookings/${id}/reject`, { reason });
            return response.data;
        },

        convertBooking: async (id: string, technicianId?: string): Promise<{
            message: string;
            workOrderId: string;
            ticketNumber: string;
        }> => {
            const response = await client.post(`/repair/admin/bookings/${id}/convert`, { technicianId });
            return response.data;
        },

        // Work Orders
        getWorkOrders: async (page = 1, pageSize = 20, status?: string): Promise<{
            total: number;
            page: number;
            pageSize: number;
            workOrders: any[];
        }> => {
            const response = await client.get('/repair/admin/work-orders', { params: { page, pageSize, status } });
            return response.data;
        },

        getWorkOrder: async (id: string): Promise<any> => {
            const response = await client.get(`/repair/admin/work-orders/${id}`);
            return response.data;
        },

        assignTechnician: async (id: string, technicianId: string): Promise<{ message: string; status: string }> => {
            const response = await client.put(`/repair/admin/work-orders/${id}/assign`, { technicianId });
            return response.data;
        },

        startRepair: async (id: string): Promise<{ message: string; status: string }> => {
            const response = await client.put(`/repair/admin/work-orders/${id}/start`);
            return response.data;
        },

        completeRepair: async (id: string, data: { partsCost: number; laborCost: number; notes?: string }): Promise<{
            message: string;
            status: string;
            totalCost: number;
        }> => {
            const response = await client.put(`/repair/admin/work-orders/${id}/complete`, data);
            return response.data;
        },

        cancelWorkOrder: async (id: string, reason: string): Promise<{ message: string; status: string }> => {
            const response = await client.put(`/repair/admin/work-orders/${id}/cancel`, { reason });
            return response.data;
        },

        // Payment + handover (W2-13 new, contract `docs/api-contracts/repair.md`).
        readyForPickup: async (id: string): Promise<{ message: string; status: WorkOrderStatus }> => {
            const response = await client.put(`/repair/admin/work-orders/${id}/ready-for-pickup`);
            return response.data;
        },

        pay: async (id: string, paymentReference?: string): Promise<{ message: string; status: WorkOrderStatus }> => {
            const response = await client.put(`/repair/admin/work-orders/${id}/pay`, { paymentReference });
            return response.data;
        },

        handover: async (id: string, receivedByName: string): Promise<{ message: string; status: WorkOrderStatus }> => {
            const response = await client.put(`/repair/admin/work-orders/${id}/handover`, { receivedByName });
            return response.data;
        },

        getStats: async (): Promise<{
            totalWorkOrders: number;
            todayWorkOrders: number;
            monthWorkOrders: number;
            pendingWorkOrders: number;
            inProgressWorkOrders: number;
            completedWorkOrders: number;
            totalRevenue: number;
        }> => {
            const response = await client.get('/repair/admin/stats');
            return response.data;
        },

        getTechnicians: async (): Promise<Array<{
            id: string;
            name: string;
            specialty: string;
            hourlyRate: number;
            isAvailable: boolean;
            activeWorkOrders: number;
        }>> => {
            const response = await client.get('/repair/admin/technicians');
            return response.data;
        },

        createTechnician: async (data: { name: string; specialty: string; hourlyRate?: number }): Promise<{
            message: string;
            technicianId: string;
        }> => {
            const response = await client.post('/repair/admin/technicians', data);
            return response.data;
        },

        // W2-13 new: PUT technician (name/specialty/hourlyRate/isAvailable). No dedicated
        // deactivate endpoint exists yet — `isAvailable:false` is the closest equivalent
        // (contract "Known gaps"; filed as IR for a real soft-delete action).
        updateTechnician: async (id: string, data: {
            name: string;
            specialty: string;
            hourlyRate: number;
            isAvailable?: boolean;
        }): Promise<{ message: string }> => {
            const response = await client.put(`/repair/admin/technicians/${id}`, data);
            return response.data;
        },
    },
};
