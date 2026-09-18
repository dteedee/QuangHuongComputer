/**
 * Instalment queue (W3-17 Implementation Steps #7). Shows partner, term,
 * down payment, the hold-expiry countdown and the consent timestamp — the
 * hold is what protects stock, so it must stay visible (Key Insights).
 * Approve captures the finance contract number; reject captures a reason and
 * warns the order will be cancelled and stock released (contract §2).
 */
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader, DataTable, StatusBadge, Button, notify, type DataTableColumn } from '../../../components/ui';
import { installmentsAdminApi, type InstallmentApplicationDto } from '../../../api/sales/installments-admin';
import { installmentStatusBadge } from '../quotations/components/b2b/document-status-badge';
import { ApprovalDialog } from '../quotations/components/b2b/approval-dialog';
import { CustomerDetailDrawer } from '../quotations/components/b2b/customer-detail-drawer';
import { useInstallmentOrderLookup } from './use-installment-order-lookup';

type ActionKind = 'approve' | 'reject' | null;

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const now = useNow();
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return <span className="num text-danger">Đã hết hạn giữ hàng</span>;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const urgent = ms < 3_600_000;
  return <span className={`num ${urgent ? 'text-warning font-semibold' : ''}`}>{h}g {m}p {s}s</span>;
}

export default function InstallmentQueuePage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['installments', 'pending'], queryFn: installmentsAdminApi.getPending, refetchInterval: 30_000 });
  const orderLookup = useInstallmentOrderLookup((query.data ?? []).map((a) => a.orderId));

  const [target, setTarget] = useState<InstallmentApplicationDto | null>(null);
  const [action, setAction] = useState<ActionKind>(null);
  const [busy, setBusy] = useState(false);
  const [drawerTarget, setDrawerTarget] = useState<InstallmentApplicationDto | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['installments', 'pending'] });

  const runAction = async (value?: string) => {
    if (!target || !action || !value) return;
    setBusy(true);
    try {
      if (action === 'approve') {
        await installmentsAdminApi.approve(target.id, { financeContractNumber: value });
        notify.success('Đã duyệt hồ sơ trả góp — đơn hàng đã ghi nhận thanh toán');
      } else {
        await installmentsAdminApi.reject(target.id, { reason: value });
        notify.success('Đã từ chối hồ sơ — đơn hàng đã huỷ, tồn kho đã nhả');
      }
      setAction(null); setTarget(null);
      invalidate();
    } catch (err) {
      const message = (err as { normalized?: { message?: string } })?.normalized?.message;
      notify.error('Thao tác thất bại', { description: message });
    } finally {
      setBusy(false);
    }
  };

  const columns: DataTableColumn<InstallmentApplicationDto>[] = [
    { id: 'orderNumber', header: 'Đơn hàng', locked: true, cell: (r) => <span className="num">{orderLookup.get(r.orderId)?.orderNumber ?? r.orderId.slice(0, 8)}</span> },
    {
      id: 'customer', header: 'Khách hàng',
      cell: (r) => {
        const name = orderLookup.get(r.orderId)?.customer.name;
        return <button className="text-left underline-offset-2 hover:underline" onClick={() => setDrawerTarget(r)}>{name ?? '(đang tải...)'}</button>;
      },
    },
    { id: 'provider', header: 'Đối tác', cell: (r) => r.provider },
    { id: 'term', header: 'Kỳ hạn', align: 'right', cell: (r) => <span className="num">{r.termMonths} tháng</span> },
    { id: 'downPayment', header: 'Trả trước', align: 'right', cell: (r) => <span className="num">{r.downPayment.toLocaleString('vi-VN')}đ</span> },
    { id: 'monthly', header: 'Ước tính/tháng', align: 'right', cell: (r) => <span className="num">{r.monthlyAmount.toLocaleString('vi-VN')}đ</span> },
    { id: 'consent', header: 'Đồng ý lúc', cell: (r) => r.consentAt ? new Date(r.consentAt).toLocaleString('vi-VN') : '—' },
    { id: 'expiresAt', header: 'Hạn giữ hàng', cell: (r) => r.expiresAt ? <HoldCountdown expiresAt={r.expiresAt} /> : '—' },
    { id: 'status', header: 'Trạng thái', cell: (r) => <StatusBadge {...installmentStatusBadge(r.status)} /> },
    {
      id: 'actions', header: '', width: '1%', locked: true,
      cell: (r) => r.status !== 'PendingApproval' ? null : (
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={() => { setTarget(r); setAction('approve'); }}>Duyệt</Button>
          <Button size="sm" variant="danger" onClick={() => { setTarget(r); setAction('reject'); }}>Từ chối</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <PageHeader title="Hồ sơ trả góp" description="Khách đăng ký, nhân viên hoàn tất giấy tờ trên cổng công ty tài chính rồi ghi số hợp đồng tại đây. Không thu CCCD/sao kê qua hệ thống." />

      <DataTable
        caption="Danh sách hồ sơ trả góp chờ duyệt"
        columns={columns}
        rows={query.data}
        rowKey={(r) => r.id}
        loading={query.isPending}
        error={query.error ?? undefined}
        onRetry={query.refetch}
        empty={{ title: 'Không có hồ sơ chờ duyệt', description: 'Danh sách trống — không có gì cần xử lý ngay.' }}
      />

      <ApprovalDialog
        open={action === 'approve'} onOpenChange={(v) => !v && setAction(null)}
        title="Duyệt hồ sơ trả góp" tone="default" confirmLabel="Duyệt"
        description="Đơn hàng sẽ được ghi nhận đã thanh toán qua công ty tài chính ngay sau khi duyệt."
        input={{ label: 'Số hợp đồng công ty tài chính cấp', placeholder: 'VD: HC-2026-00123' }}
        loading={busy} onConfirm={(v) => void runAction(v)}
      />
      <ApprovalDialog
        open={action === 'reject'} onOpenChange={(v) => !v && setAction(null)}
        title="Từ chối hồ sơ trả góp" tone="danger" confirmLabel="Từ chối"
        description="Đơn hàng liên quan sẽ bị HUỶ và tồn kho được nhả lại ngay khi từ chối."
        input={{ label: 'Lý do từ chối', multiline: true }}
        loading={busy} onConfirm={(v) => void runAction(v)}
      />

      <CustomerDetailDrawer
        open={!!drawerTarget} onClose={() => setDrawerTarget(null)}
        info={drawerTarget ? (() => {
          const order = orderLookup.get(drawerTarget.orderId);
          return { customerId: order?.customer.customerId, name: order?.customer.name ?? 'Khách hàng', phone: order?.customer.phone, email: order?.customer.email };
        })() : null}
      />
    </div>
  );
}
