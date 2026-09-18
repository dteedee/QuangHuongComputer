/**
 * Quotation detail — state actions (send/accept/reject), print link, convert
 * dialog, customer drawer (Implementation Steps #3, #5). Every transition
 * confirms first; reject needs a reason (contract §2 `POST /reject`).
 */
import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, Pencil, Send, Check, X, ArrowRightLeft } from 'lucide-react';
import { PageHeader, Card, CardBody, Button, StatusBadge, QueryBoundary, Skeleton, notify } from '../../../components/ui';
import { quotationsApi } from '../../../api/sales/quotations';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';
import { paths } from '../../../routes';
import { quotationStatusBadge } from './components/b2b/document-status-badge';
import { ApprovalDialog } from './components/b2b/approval-dialog';
import { CustomerDetailDrawer } from './components/b2b/customer-detail-drawer';
import { QuotationConvertDialog } from './quotation-convert-dialog';

type ActionKind = 'send' | 'accept' | 'reject' | null;

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission(PERMISSIONS.SALES_QUOTATIONS_EDIT);

  const [action, setAction] = useState<ActionKind>(null);
  const [busy, setBusy] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const query = useQuery({ queryKey: ['quotation', id], queryFn: () => quotationsApi.getById(id as string), enabled: !!id });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['quotation', id] });

  const runAction = async (value?: string) => {
    if (!id || !action) return;
    setBusy(true);
    try {
      if (action === 'send') await quotationsApi.send(id);
      else if (action === 'accept') await quotationsApi.accept(id);
      else if (action === 'reject') await quotationsApi.reject(id, value);
      notify.success(action === 'send' ? 'Đã gửi báo giá' : action === 'accept' ? 'Đã chấp nhận báo giá' : 'Đã từ chối báo giá');
      setAction(null);
      invalidate();
    } catch (err) {
      const message = (err as { normalized?: { message?: string } })?.normalized?.message;
      notify.error('Thao tác thất bại', { description: message });
    } finally {
      setBusy(false);
    }
  };

  if (!id) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 lg:p-6">
      <QueryBoundary query={query} skeleton={<div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>} errorTitle="Không tải được báo giá">
        {(q) => (
          <>
            <PageHeader
              title={`Báo giá ${q.quotationNumber}`}
              description={`${q.buyerLegalName ?? q.customerName ?? ''} · hiệu lực đến ${q.validUntil ? new Date(q.validUntil).toLocaleDateString('vi-VN') : '—'}`}
              actions={<StatusBadge {...quotationStatusBadge(q.status)} />}
            />

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>Xem khách hàng</Button>
              <Link to={paths.backoffice.quotationPrint(q.id)} target="_blank">
                <Button variant="outline" size="sm"><Printer className="mr-1.5 h-4 w-4" /> In</Button>
              </Link>
              {canEdit && q.status === 'Draft' && (
                <Button variant="outline" size="sm" onClick={() => navigate(paths.backoffice.quotationEdit(q.id))}>
                  <Pencil className="mr-1.5 h-4 w-4" /> Sửa
                </Button>
              )}
              {canEdit && q.status === 'Draft' && (
                <Button size="sm" onClick={() => setAction('send')}><Send className="mr-1.5 h-4 w-4" /> Gửi báo giá</Button>
              )}
              {canEdit && q.status === 'Sent' && (
                <>
                  <Button size="sm" onClick={() => setAction('accept')}><Check className="mr-1.5 h-4 w-4" /> Khách chấp nhận</Button>
                  <Button variant="danger" size="sm" onClick={() => setAction('reject')}><X className="mr-1.5 h-4 w-4" /> Khách từ chối</Button>
                </>
              )}
              {canEdit && q.status === 'Accepted' && (
                <Button size="sm" onClick={() => setConvertOpen(true)}><ArrowRightLeft className="mr-1.5 h-4 w-4" /> Chuyển thành đơn hàng</Button>
              )}
              {q.status === 'Converted' && q.convertedOrderId && (
                <Link to={paths.backoffice.orders()}>
                  <Button variant="outline" size="sm">Xem danh sách đơn hàng (đã tạo từ báo giá này)</Button>
                </Link>
              )}
            </div>

            <Card><CardBody className="space-y-3">
              <h2 className="text-sm font-semibold">Người mua</h2>
              <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                <div><span className="text-fg-muted">Tên pháp lý:</span> {q.buyerLegalName}</div>
                <div><span className="text-fg-muted">Loại:</span> {q.buyerType === 'Individual' ? 'Cá nhân' : q.buyerType === 'Organization' ? 'Doanh nghiệp' : 'Đơn vị ngân sách'}</div>
                {q.buyerTaxCode && <div><span className="text-fg-muted">MST:</span> {q.buyerTaxCode}</div>}
                {q.buyerBudgetUnitCode && <div><span className="text-fg-muted">Mã ĐVQHNS:</span> {q.buyerBudgetUnitCode}</div>}
                <div><span className="text-fg-muted">Người liên hệ:</span> {q.customerName} {q.customerPhone && `· ${q.customerPhone}`}</div>
                {q.buyerAddress && <div className="sm:col-span-2"><span className="text-fg-muted">Địa chỉ:</span> {q.buyerAddress}</div>}
              </div>
            </CardBody></Card>

            <Card><CardBody className="space-y-2">
              <h2 className="text-sm font-semibold">Dòng hàng</h2>
              <div className="divide-y divide-line">
                {q.lines.map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-2 text-sm">
                    <div>{l.productName} <span className="num text-fg-muted">({l.productSku}) × {l.quantity}</span></div>
                    <div className="num">{l.lineTotal.toLocaleString('vi-VN')}đ</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
                <span>Tổng cộng</span><span className="num">{q.totalAmount.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="text-xs text-fg-muted">
                {q.paymentTermDays > 0 ? `Trả sau ${q.paymentTermDays} ngày` : 'Trả ngay'}
              </div>
            </CardBody></Card>

            <ApprovalDialog
              open={action === 'send'} onOpenChange={(v) => !v && setAction(null)}
              title="Gửi báo giá cho khách" description="Báo giá sẽ chuyển sang trạng thái Đã gửi, không sửa được nữa trừ khi tạo lại."
              confirmLabel="Gửi" loading={busy} onConfirm={() => void runAction()}
            />
            <ApprovalDialog
              open={action === 'accept'} onOpenChange={(v) => !v && setAction(null)}
              title="Xác nhận khách đã chấp nhận báo giá này"
              confirmLabel="Xác nhận chấp nhận" loading={busy} onConfirm={() => void runAction()}
            />
            <ApprovalDialog
              open={action === 'reject'} onOpenChange={(v) => !v && setAction(null)}
              title="Từ chối báo giá" tone="danger" confirmLabel="Từ chối"
              input={{ label: 'Lý do từ chối', multiline: true }} loading={busy} onConfirm={(reason) => void runAction(reason)}
            />

            {convertOpen && (
              <QuotationConvertDialog
                open={convertOpen} onOpenChange={setConvertOpen} quotation={q}
                onConverted={() => { setConvertOpen(false); invalidate(); }}
              />
            )}

            <CustomerDetailDrawer
              open={drawerOpen} onClose={() => setDrawerOpen(false)}
              info={{ customerId: q.customerId, name: q.customerName ?? q.buyerLegalName ?? 'Khách hàng', phone: q.customerPhone, email: q.customerEmail, address: q.buyerAddress }}
            />
          </>
        )}
      </QueryBoundary>
    </div>
  );
}
