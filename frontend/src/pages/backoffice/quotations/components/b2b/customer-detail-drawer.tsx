/**
 * Customer detail drawer shared by the quotation and instalment queues
 * (Requirements). Shows the contact block already carried on the document
 * itself (never fetches nothing then blanks the drawer), plus the CRM
 * profile when the document is linked to a registered customer.
 */
import { useQuery } from '@tanstack/react-query';
import { Drawer, QueryBoundary, Money, Skeleton } from '../../../../../components/ui';
import { crmApi } from '../../../../../api/crm';

export interface CustomerDetailDrawerInfo {
  customerId?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export function CustomerDetailDrawer({
  open,
  onClose,
  info,
}: {
  open: boolean;
  onClose: () => void;
  info: CustomerDetailDrawerInfo | null;
}) {
  const customerId = info?.customerId ?? undefined;
  const crmQuery = useQuery({
    queryKey: ['b2b-customer-detail', customerId],
    queryFn: () => crmApi.customers.getById(customerId as string),
    enabled: open && !!customerId,
  });

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()} side="right" title={info?.name ?? 'Khách hàng'}>
      {!info ? null : (
        <div className="space-y-5 p-4">
          <div className="space-y-1 text-sm">
            <div className="font-semibold">{info.name}</div>
            {info.phone && <div className="text-fg-muted">{info.phone}</div>}
            {info.email && <div className="text-fg-muted">{info.email}</div>}
            {info.address && <div className="text-fg-muted">{info.address}</div>}
          </div>

          {customerId && (
            <QueryBoundary
              query={crmQuery}
              skeleton={<Skeleton className="h-24 w-full" />}
              errorTitle="Không tải được hồ sơ CRM của khách"
            >
              {(detail) => (
                <div className="space-y-2 border-t border-line pt-4 text-sm">
                  <h3 className="font-semibold">Hồ sơ CRM</h3>
                  <div className="flex justify-between"><span className="text-fg-muted">Tổng đơn</span><span className="num">{detail.totalOrderCount}</span></div>
                  <div className="flex justify-between"><span className="text-fg-muted">Tổng chi tiêu</span><Money value={detail.totalSpent} /></div>
                  <div className="flex justify-between"><span className="text-fg-muted">Giai đoạn</span><span>{detail.lifecycleStageName}</span></div>
                </div>
              )}
            </QueryBoundary>
          )}
        </div>
      )}
    </Drawer>
  );
}
