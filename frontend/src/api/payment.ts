
import client from './client';

// ============================================
// Payment Types
// ============================================
export type PaymentProvider = 0 | 1 | 2 | 3 | 4; // 0=Stripe, 1=VNPay, 2=Momo, 3=COD, 4=SePay

export interface PaymentIntent {
    id: string;
    orderId: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    provider: PaymentProvider;
    externalId?: string;
    createdAt: string;
}

export type PaymentStatus = 'Pending' | 'Processing' | 'Succeeded' | 'Failed' | 'Cancelled';

export interface InitiatePaymentRequest {
    orderId: string;
    amount: number;
    provider: PaymentProvider;
    bankCode?: string;
}

export interface InitiatePaymentResponse {
    paymentId: string;
    clientSecret: string;
    status: PaymentStatus;
    paymentUrl?: string;
}

// ============================================
// Payment API Functions
// ============================================
export const paymentApi = {
    // Initiate a payment
    initiate: async (data: InitiatePaymentRequest): Promise<InitiatePaymentResponse> => {
        const response = await client.post('/payments/initiate', data);
        return response.data;
    },

    // Get payment status
    getPayment: async (id: string): Promise<PaymentIntent> => {
        const response = await client.get(`/payments/${id}`);
        return response.data;
    },

    // Mock webhook (for testing)
    mockWebhook: async (data: { paymentId: string; success: boolean }): Promise<void> => {
        await client.post('/payments/webhook/mock', data);
    },

    // Helper to create VNPay payment URL (frontend-side)
    createVNPayUrl: (paymentUrl: string, returnUrl?: string): string => {
        const baseReturnUrl = returnUrl || `${window.location.origin}/payment/callback`;
        return paymentUrl.includes('?')
            ? `${paymentUrl}&vnp_ReturnUrl=${encodeURIComponent(baseReturnUrl)}`
            : `${paymentUrl}?vnp_ReturnUrl=${encodeURIComponent(baseReturnUrl)}`;
    },

    // Helper to parse VNPay callback response
    parseVNPayCallback: (params: URLSearchParams): {
        success: boolean;
        orderId: string;
        amount: number;
        message: string;
    } => {
        const responseCode = params.get('vnp_ResponseCode');
        const success = responseCode === '00';
        const orderId = params.get('vnp_OrderInfo')?.replace('Thanh toan don hang ', '') || '';
        const amount = parseInt(params.get('vnp_Amount') || '0') / 100;

        return {
            success,
            orderId,
            amount,
            message: success ? 'Thanh toán thành công' : 'Thanh toán thất bại'
        };
    },

    // --- Admin Endpoints ---
    getSePayTransactions: async (): Promise<SePayTransaction[]> => {
        const response = await client.get('/payments/admin/sepay-transactions');
        return response.data;
    },

    getSePayStats: async (): Promise<SePayStats> => {
        const response = await client.get('/payments/admin/sepay-stats');
        return response.data;
    },

    getPaymentConfigs: async (): Promise<PaymentConfig[]> => {
        const response = await client.get('/payments/admin/config');
        return response.data;
    },

    updatePaymentConfig: async (data: PaymentConfig): Promise<PaymentConfig> => {
        const response = await client.post('/payments/admin/config', data);
        return response.data;
    }
};

export interface SePayTransaction {
    id: number;
    gateway: string;
    transactionDate: string;
    accountNumber: string;
    subAccount?: string;
    content: string;
    transferType: string;
    transferAmount: number;
    accumulated: number; // Current balance
    code?: string;
    referenceCode?: string;
    description?: string;
    isProcessed: boolean;
    relatedOrderId?: string;
    processingError?: string;
}

export interface SePayStats {
    totalRevenue: number;
    todayRevenue: number;
    totalTransactions: number;
    successRate: number;
}

export interface PaymentConfig {
    key: string;
    value: string;
    description?: string;
    isSecret: boolean;
}

// Helper to get payment provider label
export const getPaymentProviderLabel = (provider: PaymentProvider): string => {
    const labels: Record<PaymentProvider, string> = {
        0: 'Stripe',
        1: 'VNPay',
        2: 'Momo',
        3: 'COD',
        4: 'SePay'
    };
    return labels[provider] || 'Unknown';
};

// Helper to get payment status color
export const getPaymentStatusColor = (status: PaymentStatus): string => {
    const colors: Record<PaymentStatus, string> = {
        Pending: 'bg-yellow-100 text-yellow-800',
        Processing: 'bg-blue-100 text-blue-800',
        Succeeded: 'bg-green-100 text-green-800',
        Failed: 'bg-red-100 text-red-800',
        Cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};
