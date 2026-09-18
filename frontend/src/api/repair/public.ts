/**
 * Repair — CUSTOMER surface (book service, my work orders/requests, view +
 * approve/reject a quote). Split out of the old flat `api/repair.ts` (W1-9,
 * step 7c). Functions moved verbatim; `api/repair.ts` re-exports them.
 */
import client from '../client';
import type { BookingStatus, QuoteStatus, RepairQuote, ServiceBooking, ServiceLocation, ServiceType, TimeSlot, WorkOrderStatus } from './types';

export const repairPublicApi = {
    booking: {
        create: async (data: {
            serviceType: ServiceType;
            deviceModel: string;
            serialNumber?: string;
            issueDescription: string;
            preferredDate: string;
            timeSlot: TimeSlot;
            serviceAddress?: string;
            locationType?: ServiceLocation;
            locationNotes?: string;
            acceptedTerms: boolean;
            customerName: string;
            customerPhone: string;
            customerEmail: string;
            imageUrls?: string[];
            videoUrls?: string[];
            organizationId?: string;
            allowPayLater?: boolean;
        }): Promise<{
            id: string;
            customerId: string;
            serviceType: ServiceType;
            preferredDate: string;
            preferredTimeSlot: TimeSlot;
            onSiteFee: number;
            status: BookingStatus;
            message: string;
        }> => {
            const response = await client.post('/repair/book', data);
            return response.data;
        },

        getMyBookings: async (): Promise<any[]> => {
            const response = await client.get('/repair/bookings');
            return response.data;
        },

        getBooking: async (id: string): Promise<ServiceBooking> => {
            const response = await client.get(`/repair/bookings/${id}`);
            return response.data;
        },
    },

    workOrders: {
        create: async (data: { deviceModel: string; serialNumber: string; description: string }): Promise<{
            id: string;
            ticketNumber: string;
            status: string;
            description: string;
            message: string;
        }> => {
            const response = await client.post('/repair/work-orders', data);
            return response.data;
        },

        getMyWorkOrders: async (): Promise<any[]> => {
            const response = await client.get('/repair/work-orders');
            return response.data;
        },

        getMyWorkOrder: async (id: string): Promise<any> => {
            const response = await client.get(`/repair/work-orders/${id}`);
            return response.data;
        },

        // Legacy repair requests (backward compatibility)
        createRequest: async (data: { deviceModel: string; serialNumber: string; issueDescription: string }): Promise<any> => {
            const response = await client.post('/repair/requests', data);
            return response.data;
        },

        getMyRequests: async (): Promise<any[]> => {
            const response = await client.get('/repair/requests');
            return response.data;
        },
    },

    quotes: {
        get: async (id: string): Promise<RepairQuote> => {
            const response = await client.get(`/repair/quotes/${id}`);
            return response.data;
        },

        approve: async (id: string): Promise<{
            message: string;
            quoteStatus: QuoteStatus;
            workOrderStatus: WorkOrderStatus;
        }> => {
            const response = await client.put(`/repair/quotes/${id}/approve`);
            return response.data;
        },

        reject: async (id: string, reason: string): Promise<{
            message: string;
            quoteStatus: QuoteStatus;
            workOrderStatus: WorkOrderStatus;
        }> => {
            const response = await client.put(`/repair/quotes/${id}/reject`, { reason });
            return response.data;
        },
    },
};
