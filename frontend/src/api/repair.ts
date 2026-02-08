
import client from './client';

// ============================================
// Repair API Types
// ============================================
export type ServiceType = 'InShop' | 'OnSite';
export type ServiceLocation = 'CustomerHome' | 'CustomerOffice' | 'School' | 'Government' | 'Other';
export type TimeSlot = 'Morning' | 'Afternoon' | 'Evening';
export type BookingStatus = 'Pending' | 'Approved' | 'Rejected' | 'Converted';
export type QuoteStatus = 'Pending' | 'Approved' | 'Rejected' | 'Expired';

export type WorkOrderStatus =
    | 'Requested'
    | 'Assigned'
    | 'Declined'
    | 'Diagnosed'
    | 'Quoted'
    | 'AwaitingApproval'
    | 'Approved'
    | 'Rejected'
    | 'InProgress'
    | 'OnHold'
    | 'Completed'
    | 'Cancelled';

export interface ServiceBooking {
    id: string;
    customerId: string;
    organizationId?: string;
    serviceType: ServiceType;
    deviceModel: string;
    serialNumber?: string;
    issueDescription: string;
    imageUrls?: string[];
    videoUrls?: string[];
    preferredDate: string;
    preferredTimeSlot: TimeSlot;
    serviceAddress?: string;
    locationType?: ServiceLocation;
    locationNotes?: string;
    estimatedCost: number;
    onSiteFee: number;
    acceptedTerms: boolean;
    termsAcceptedAt?: string;
    status: BookingStatus;
    workOrderId?: string;
    allowPayLater: boolean;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    createdAt: string;
}

export interface WorkOrder {
    id: string;
    ticketNumber: string;
    customerId: string;
    deviceModel: string;
    serialNumber?: string;
    description: string;
    status: WorkOrderStatus;
    technicianId?: string;
    serviceType?: ServiceType;
    serviceAddress?: string;
    estimatedCost: number;
    actualCost: number;
    partsCost: number;
    laborCost: number;
    serviceFee: number;
    totalCost: number;
    technicalNotes?: string;
    serviceBookingId?: string;
    currentQuoteId?: string;
    createdAt: string;
    assignedAt?: string;
    diagnosedAt?: string;
    quotedAt?: string;
    approvedAt?: string;
    startedAt?: string;
    finishedAt?: string;
}

export interface WorkOrderPart {
    id: string;
    workOrderId: string;
    inventoryItemId: string;
    partName: string;
    partNumber?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface RepairQuote {
    id: string;
    workOrderId: string;
    quoteNumber: string;
    partsCost: number;
    laborCost: number;
    serviceFee: number;
    totalCost: number;
    estimatedHours: number;
    hourlyRate: number;
    description?: string;
    notes?: string;
    status: QuoteStatus;
    approvedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    validUntil: string;
    createdAt: string;
    isExpired: boolean;
}

export interface ActivityLog {
    id: string;
    workOrderId: string;
    activity: string;
    description?: string;
    previousStatus?: WorkOrderStatus;
    newStatus?: WorkOrderStatus;
    performedByName?: string;
    createdAt: string;
}

// ============================================
// Repair API Functions
// ============================================
export const repairApi = {
    // ============ Booking Endpoints ============
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

    // ============ Work Order Endpoints ============
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

    // ============ Quote Endpoints ============
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

        // Technician: Update quote
        update: async (id: string, updates: {
            partsCost?: number;
            laborCost?: number;
            serviceFee?: number;
        }): Promise<{ message: string; totalCost: number }> => {
            const response = await client.put(`/repair/quotes/${id}`, updates);
            return response.data;
        },

        // Technician: Mark as awaiting approval
        markAwaitingApproval: async (id: string): Promise<{
            message: string;
            workOrderStatus: WorkOrderStatus;
        }> => {
            const response = await client.put(`/repair/quotes/${id}/await-approval`);
            return response.data;
        },
    },

    // ============ Technician Endpoints ============
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

    // ============ Admin Endpoints ============
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
    },
};

// ============================================
// Helper Functions
// ============================================
export const getStatusColor = (status: WorkOrderStatus): string => {
    const colors: Record<WorkOrderStatus, string> = {
        Requested: 'bg-blue-100 text-blue-800',
        Assigned: 'bg-purple-100 text-purple-800',
        Declined: 'bg-red-100 text-red-800',
        Diagnosed: 'bg-cyan-100 text-cyan-800',
        Quoted: 'bg-indigo-100 text-indigo-800',
        AwaitingApproval: 'bg-yellow-100 text-yellow-800',
        Approved: 'bg-green-100 text-green-800',
        Rejected: 'bg-red-100 text-red-800',
        InProgress: 'bg-blue-100 text-blue-800',
        OnHold: 'bg-orange-100 text-orange-800',
        Completed: 'bg-green-100 text-green-800',
        Cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getTimeSlotLabel = (slot: TimeSlot): string => {
    const labels: Record<TimeSlot, string> = {
        Morning: '8:00 AM - 12:00 PM',
        Afternoon: '1:00 PM - 5:00 PM',
        Evening: '5:00 PM - 8:00 PM',
    };
    return labels[slot];
};
