/**
 * Client-side mirror of `OrderStateMachine.cs`
 * (`docs/api-contracts/sales-orders.md` §1) — ONE-WAY, no back edges.
 *
 * This is a UX hint only (disables illegal kanban drop targets before the
 * network round-trip); the backend is still the sole authority and returns
 * 409 on an illegal move regardless. Per-order truth comes from
 * `GET .../transitions#allowedNext`, used by the detail drawer's action bar.
 */
import type { OrderStatus } from '../../../api/sales/types';

/**
 * `docs/api-contracts/sales-orders.md` §1 also lists `Fulfilled` as a status
 * (not in the shared `OrderStatus` union — see the NOTE in `api/sales/types.ts`).
 * Widened locally here since this track's own kanban/action-bar code needs it.
 */
export type ExtendedOrderStatus = OrderStatus | 'Fulfilled';

export const ORDER_STATE_MACHINE: Record<ExtendedOrderStatus, ExtendedOrderStatus[]> = {
    Draft: ['Pending', 'Confirmed', 'Cancelled'],
    Pending: ['Confirmed', 'Paid', 'Cancelled'],
    Confirmed: ['Paid', 'Fulfilled', 'Shipped', 'Cancelled'],
    Paid: ['Fulfilled', 'Shipped', 'Completed', 'Cancelled'],
    Fulfilled: ['Shipped', 'Delivered', 'Completed', 'Cancelled'],
    Shipped: ['Delivered', 'Cancelled'],
    Delivered: ['Completed', 'Cancelled'],
    Completed: [],
    Cancelled: [],
};

export const isLegalTransition = (from: ExtendedOrderStatus, to: ExtendedOrderStatus): boolean =>
    from === to || (ORDER_STATE_MACHINE[from] ?? []).includes(to);
