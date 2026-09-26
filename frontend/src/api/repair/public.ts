/**
 * Repair — CUSTOMER surface (book service, my work orders/requests, view +
 * approve/reject a quote). Split out of the old flat `api/repair.ts` (W1-9,
 * step 7c). Functions moved verbatim; `api/repair.ts` re-exports them.
 */
import client from '../client';
import type { BookingStatus, QuoteStatus, ServiceBooking, ServiceLocation, ServiceType, TimeSlot, WorkOrderStatus } from './types';
import type { PublicTrackedQuote, RepairQuote } from './quote-types';

export const repairPublicApi = {
    booking: {
        create: async (data: {
            /** Catalog service (preferred). `serviceType` is only the legacy InShop/OnSite fallback. */
            serviceTypeId?: string;
            serviceType?: ServiceType;
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
            bookingNumber: string;
            customerId: string;
            serviceType: ServiceType;
            serviceTypeName?: string;
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

        /** Remaining capacity per time slot for a date (`yyyy-MM-dd`) — enforced again server-side on submit. */
        getSlots: async (date: string): Promise<{
            date: string;
            slots: Array<{ slot: TimeSlot; capacity: number | null; remaining: number | null; isFull: boolean }>;
        }> => {
            const response = await client.get('/repair/booking-slots', { params: { date } });
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

    /**
     * Tra cứu tình trạng sửa chữa CÔNG KHAI bằng mã ticket + SĐT — không cần đăng nhập.
     * Backend (`docs/api-contracts/repair.md` "Public ticket tracking"): rate-limited (policy
     * `contact`), 404 (đồng dạng) nếu ticket không tồn tại HOẶC SĐT không khớp — không lộ PII.
     * Gap đã biết: chỉ theo dõi được `WorkOrder` có `TicketNumber` (walk-in / "Gửi yêu cầu
     * nhanh"), KHÔNG theo dõi được `ServiceBooking` (đặt lịch qua `/booking`) vì booking chưa có
     * TicketNumber — xem integration-requests-w3.md.
     */
    track: async (ticketNumber: string, phone: string): Promise<{
        ticketNumber: string;
        deviceModel: string;
        status: WorkOrderStatus;
        createdAt: string;
        startedAt?: string;
        finishedAt?: string;
        /** Current quote with its lines + VAT breakdown (server-computed). */
        quote?: PublicTrackedQuote | null;
        timeline?: { activity: string; description?: string | null; createdAt: string }[];
    }> => {
        const response = await client.get(`/repair/track/${encodeURIComponent(ticketNumber)}`, {
            params: { phone },
        });
        return response.data;
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
