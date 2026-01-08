import client from './client';

export interface InitiatePaymentResponse {
    paymentId: string;
    clientSecret: string;
    status: string;
}

export const paymentApi = {
    initiate: async (data: { orderId: string; amount: number; provider: number }) => {
        const response = await client.post<InitiatePaymentResponse>('/payments/initiate', data);
        return response.data;
    },

    mockWebhook: async (data: { paymentId: string; success: boolean }) => {
        const response = await client.post('/payments/webhook/mock', data);
        return response.data;
    }
};
