/**
 * Điểm thưởng — mặt QUẢN TRỊ (`docs/api-contracts/sales-pos-returns-loyalty.md` §3).
 * Nằm cạnh trang dùng nó vì `api/sales/*` không có file loyalty admin và track này không sở hữu
 * các file đó (đã ghi integration request W3-5#4 để gom về `api/sales/loyalty-admin.ts` ở gate).
 */
import client from '../../../api/client';

export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export interface LoyaltyAccountRow {
    id: string;
    userId: string;
    totalPoints: number;
    availablePoints: number;
    lifetimePoints: number;
    tier: LoyaltyTier;
    lastActivityAt: string | null;
    createdAt: string;
}

export interface LoyaltyStats {
    totalAccounts: number;
    totalPointsIssued: number;
    totalPointsAvailable: number;
    tierBreakdown: Record<string, number>;
}

export const loyaltyAdminApi = {
    list: async (params: { page: number; pageSize: number; tier?: string }) => {
        const res = await client.get<{ total: number; accounts: LoyaltyAccountRow[] }>('/sales/admin/loyalty', { params });
        return res.data;
    },
    stats: async () => (await client.get<LoyaltyStats>('/sales/admin/loyalty/stats')).data,
    /** 400 khi `points = 0` hoặc thiếu lý do; 409 khi trừ quá số dư. */
    adjust: async (userId: string, data: { points: number; reason: string }) => {
        const res = await client.post<{ message: string; newBalance: number; totalPoints: number }>(
            `/sales/admin/loyalty/${userId}/adjust`,
            data
        );
        return res.data;
    },
};

export const TIER_LABELS: Record<LoyaltyTier, string> = {
    Bronze: 'Đồng', Silver: 'Bạc', Gold: 'Vàng', Platinum: 'Bạch kim', Diamond: 'Kim cương',
};
