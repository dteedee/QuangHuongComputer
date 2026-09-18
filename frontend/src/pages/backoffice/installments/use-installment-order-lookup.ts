/**
 * The instalment application entity carries only `orderId` (no customer name,
 * no order number — verified against the real backend entity, see
 * `api/sales/installments-admin.ts`'s header comment). This hook looks each
 * pending application's order up via the existing staff order-detail
 * endpoint (`Sales.ViewAll`) so the queue can show a real customer name
 * instead of inventing one.
 */
import { useQueries } from '@tanstack/react-query';
import { salesAdminOrdersApi } from '../../../api/sales/admin-orders';
import type { OrderDetail } from '../../../api/sales/types';

export function useInstallmentOrderLookup(orderIds: string[]) {
  const results = useQueries({
    queries: orderIds.map((orderId) => ({
      queryKey: ['installments', 'order-lookup', orderId],
      queryFn: () => salesAdminOrdersApi.getDetail(orderId),
      staleTime: 60_000,
    })),
  });

  const byOrderId = new Map<string, OrderDetail>();
  orderIds.forEach((id, i) => {
    const data = results[i]?.data;
    if (data) byOrderId.set(id, data);
  });
  return byOrderId;
}
