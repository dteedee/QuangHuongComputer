/**
 * Warranty — CUSTOMER surface (my claims, register, coverage lookup, public
 * no-login lookup). Split out of the old flat `api/warranty.ts` (W1-9, step
 * 7c). Functions moved verbatim; `api/warranty.ts` re-exports them.
 */
import client from '../client';
import type { ClaimStatus, ResolutionPreference, WarrantyClaim, WarrantyCoverage, WarrantyProvider } from './types';

export interface CreateClaimRequest {
    serialNumber: string;
    issueDescription: string;
    preferredResolution?: ResolutionPreference;
    attachmentUrls?: string[];
    isManagerOverride?: boolean;
    accessoriesReceived?: string;
    receivedCondition?: string;
}

export interface RegisterWarrantyRequest {
    productId: string;
    serialNumber: string;
    purchaseDate: string;
    warrantyPeriodMonths: number;
    orderNumber?: string;
    provider?: WarrantyProvider;
}

// ============ Phase 07: Public lookup (không PII, không đăng nhập) ============

export interface PublicWarrantyActiveClaim {
    id: string;
    status: ClaimStatus;
    filedDate: string;
    estimatedCompletionDate?: string;
}

export interface PublicWarrantyEntry {
    provider: WarrantyProvider;
    isValid: boolean;
    expiresAt: string;
    warrantyPeriodMonths?: number;
    activeClaim?: PublicWarrantyActiveClaim | null;
}

export interface PublicWarrantyLookupResult {
    found: boolean;
    /** Tên sản phẩm ngắn gọn (không tiết lộ PII khách hàng). */
    productName?: string;
    /** Có thể có nhiều bản ghi (hãng + shop). */
    warranties: PublicWarrantyEntry[];
    /** Nếu quá rate-limit / cần captcha, backend trả cờ này. */
    requiresCaptcha?: boolean;
    /** Retry-After (giây) nếu bị rate limit. */
    retryAfterSeconds?: number;
}

export const warrantyPublicApi = {
    getMyClaims: async () => {
        const response = await client.get<WarrantyClaim[]>('/warranty/claims');
        return response.data;
    },

    createClaim: async (data: CreateClaimRequest) => {
        const response = await client.post<{ id: string; status: string; message: string }>('/warranty/claims', data);
        return response.data;
    },

    registerWarranty: async (data: RegisterWarrantyRequest) => {
        const response = await client.post('/warranty/register', data);
        return response.data;
    },

    lookupCoverage: async (serialNumber: string) => {
        try {
            const response = await client.get<WarrantyCoverage>(`/warranty/lookup/serial/${serialNumber}`);
            return response.data;
        } catch (error) {
            const err = error as { response?: { status?: number } };
            if (err.response?.status === 404) {
                throw new Error('Không tìm thấy bảo hành cho serial này');
            }
            throw error;
        }
    },

    lookupByInvoice: async (orderNumber: string) => {
        try {
            const response = await client.get<WarrantyCoverage[]>(`/warranty/lookup/invoice/${orderNumber}`);
            return response.data;
        } catch (error) {
            const err = error as { response?: { status?: number } };
            if (err.response?.status === 404) {
                throw new Error('Không tìm thấy bảo hành cho hóa đơn này');
            }
            throw error;
        }
    },

    lookupLegacy: async (serialNumber: string) => {
        const response = await client.get<{
            serialNumber: string;
            productId: string;
            status: string;
            expirationDate: string;
            isValid: boolean;
        }>(`/warranty/lookup/${serialNumber}`);
        return response.data;
    },

    /**
     * Tra cứu bảo hành công khai bằng Serial.
     * Backend rate-limit 10/phút/IP. Chỉ trả cờ hạn/còn hạn — KHÔNG tiết lộ tên/SĐT/địa chỉ khách.
     */
    publicLookupBySerial: async (
        serial: string,
        captchaToken?: string,
    ): Promise<PublicWarrantyLookupResult> => {
        const params: Record<string, string> = { serial };
        if (captchaToken) params.captchaToken = captchaToken;
        const response = await client.get<PublicWarrantyLookupResult>('/public/warranty/lookup', { params });
        return response.data;
    },

    /**
     * Tra cứu bảo hành công khai bằng SĐT + mã đơn hàng (cross-verify).
     */
    publicLookupByPhone: async (
        phone: string,
        orderNumber: string,
        captchaToken?: string,
    ): Promise<PublicWarrantyLookupResult> => {
        const params: Record<string, string> = { phone, orderNumber };
        if (captchaToken) params.captchaToken = captchaToken;
        const response = await client.get<PublicWarrantyLookupResult>('/public/warranty/lookup-by-phone', { params });
        return response.data;
    },
};
