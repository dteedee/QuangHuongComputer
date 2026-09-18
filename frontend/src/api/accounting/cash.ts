/**
 * Cashier shifts + cash book — `docs/api-contracts/accounting.md` §5 and §6.
 * Two permission tiers on purpose: the cashier routes (`open`/`current`/`close`/
 * `transactions`) need `Sales.Pos`, the oversight routes (`list`/`detail`/
 * `approve-variance`) need `Accounting.*`. Reconciliation formula, stored on close:
 *   expectedCash = openingBalance + Σcash-in − Σcash-out
 *   variance     = actualCash − expectedCash   (negative = till is short)
 */
import { client } from '../client';
import type {
    CashBook, CashVoucher, CashVoucherKind, CashVoucherSource, PagedResult, ShiftSession,
} from './types';

/** One row of `GET /cash-book/funds` — the fund list is derived from vouchers. */
export interface CashFund {
    fundCode: string;
    balance: number;
    voucherCount: number;
    lastVoucherAt: string;
}

export interface ShiftListParams {
    page?: number;
    pageSize?: number;
    status?: 'Open' | 'Closed';
    cashierId?: string;
    warehouseId?: string;
    sortBy?: 'openedAt' | 'closedAt' | 'variance';
    sortDir?: 'asc' | 'desc';
}

export const shiftsApi = {
    list: async (params: ShiftListParams = {}): Promise<PagedResult<ShiftSession>> => {
        const { data } = await client.get('/accounting/shifts', { params });
        return data;
    },
    get: async (id: string): Promise<ShiftSession> => {
        const { data } = await client.get(`/accounting/shifts/${id}`);
        return data;
    },
    /** 204 (no body) when the signed-in cashier has no open shift. */
    current: async (): Promise<ShiftSession | null> => {
        const res = await client.get('/accounting/shifts/current', { validateStatus: (s) => s === 200 || s === 204 });
        return res.status === 204 ? null : res.data;
    },
    open: async (payload: { warehouseId: string; openingBalance: number }): Promise<ShiftSession> => {
        const { data } = await client.post('/accounting/shifts/open', payload);
        return data;
    },
    close: async (id: string, payload: { actualCash: number; varianceReason?: string }): Promise<ShiftSession> => {
        const { data } = await client.post(`/accounting/shifts/${id}/close`, payload);
        return data;
    },
    addTransaction: async (
        id: string,
        payload: { description: string; amount: number; type: 'Debit' | 'Credit'; reference?: string },
    ): Promise<ShiftSession> => {
        const { data } = await client.post(`/accounting/shifts/${id}/transactions`, payload);
        return data;
    },
    /** The approver must be someone other than the cashier (403 otherwise). */
    approveVariance: async (id: string, note?: string): Promise<ShiftSession> => {
        const { data } = await client.post(`/accounting/shifts/${id}/approve-variance`, { note });
        return data;
    },
};

export const cashBookApi = {
    /** `fundCode` is mandatory — the API answers 400 VALIDATION_FAILED without it. */
    book: async (params: { fundCode: string; from?: string; to?: string }): Promise<CashBook> => {
        const { data } = await client.get('/accounting/cash-book', { params });
        return data;
    },
    funds: async (): Promise<CashFund[]> => {
        const { data } = await client.get('/accounting/cash-book/funds');
        return data;
    },
    vouchers: async (params: {
        page?: number; pageSize?: number; fundCode?: string; kind?: CashVoucherKind;
        source?: CashVoucherSource; search?: string; sortBy?: string; sortDir?: 'asc' | 'desc';
    } = {}): Promise<PagedResult<CashVoucher>> => {
        const { data } = await client.get('/accounting/cash-vouchers', { params });
        return data;
    },
    createVoucher: async (payload: {
        kind: CashVoucherKind; fundCode: string; amount: number;
        voucherDate?: string; description: string; counterpartyName?: string;
    }): Promise<CashVoucher> => {
        const { data } = await client.post('/accounting/cash-vouchers', payload);
        return data;
    },
};
