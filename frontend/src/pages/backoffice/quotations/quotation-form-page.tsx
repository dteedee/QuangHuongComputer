/**
 * Quotation create/edit screen (Implementation Steps #2, #6). Editing an
 * existing quotation is only allowed while it is `Draft` (contract `PUT`
 * §2) — the page opens read-only for any other status and points to the
 * detail page's actions instead.
 */
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { UseFormReturn } from 'react-hook-form';
import { Form, TextField, applyServerErrors } from '../../../components/form';
import { PageHeader, Card, CardBody, Button, Textarea, notify, QueryBoundary, Skeleton } from '../../../components/ui';
import { quotationsApi, type BuyerType, type UpsertQuotationRequest } from '../../../api/sales/quotations';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';
import { paths } from '../../../routes';
import { validationMessages as msg } from '../../../lib/validation/messages';
import { OrganisationFields } from './components/b2b/organisation-fields';
import { QuotationLineEditor, type EditableLine } from './quotation-line-editor';

const headerSchema = z.object({
  buyerType: z.enum(['Individual', 'Organization', 'BudgetUnit']),
  buyerLegalName: z.string().min(1, msg.required('Tên pháp lý người mua')),
  buyerTaxCode: z.string().optional().nullable(),
  buyerBudgetUnitCode: z.string().optional().nullable(),
  buyerAddress: z.string().optional().nullable(),
  customerName: z.string().min(1, msg.required('Người liên hệ')),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().email(msg.email).optional().nullable().or(z.literal('')),
  validUntil: z.string().optional().nullable(),
  paymentTermDays: z.coerce.number().min(0, msg.min('Điều khoản thanh toán', 0)),
  termsText: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
type HeaderValues = z.infer<typeof headerSchema>;

export default function QuotationFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canSellOnCredit = hasPermission(PERMISSIONS.SALES_SELL_ON_CREDIT);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [linesTouched, setLinesTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const existing = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationsApi.getById(id as string),
    enabled: !!id,
  });

  const isDraftOrNew = !id || existing.data?.status === 'Draft';
  const defaultValues: Partial<HeaderValues> = useMemo(() => {
    const q = existing.data;
    if (!q) return { buyerType: 'Individual', paymentTermDays: 0 };
    if (!linesTouched) {
      setLines(q.lines.map((l) => ({
        key: l.productId, productId: l.productId, productName: l.productName, productSku: l.productSku,
        quantity: l.quantity, unitPriceOverride: l.unitPrice, lineDiscount: l.lineDiscount, displayUnitPrice: l.unitPrice,
      })));
      setLinesTouched(true);
    }
    return {
      buyerType: q.buyerType, buyerLegalName: q.buyerLegalName ?? '', buyerTaxCode: q.buyerTaxCode,
      buyerBudgetUnitCode: q.buyerBudgetUnitCode, buyerAddress: q.buyerAddress, customerName: q.customerName ?? '',
      customerPhone: q.customerPhone, customerEmail: q.customerEmail ?? '', validUntil: q.validUntil?.slice(0, 10),
      paymentTermDays: q.paymentTermDays, termsText: q.termsText, notes: q.notes,
    };
  }, [existing.data, linesTouched]);

  const submit = async (data: HeaderValues, form: UseFormReturn<HeaderValues>) => {
    if (lines.length === 0) { notify.error('Chưa có dòng hàng', { description: 'Thêm ít nhất một sản phẩm trước khi lưu.' }); return; }
    const body: UpsertQuotationRequest = {
      ...data,
      buyerType: data.buyerType as BuyerType,
      customerEmail: data.customerEmail || null,
      lines: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity, unitPriceOverride: l.unitPriceOverride, lineDiscount: l.lineDiscount, notes: l.notes })),
    };
    setSubmitting(true);
    try {
      const saved = id ? await quotationsApi.update(id, body) : await quotationsApi.create(body);
      notify.success(id ? 'Đã lưu báo giá' : `Đã tạo báo giá ${saved.quotationNumber}`);
      navigate(paths.backoffice.quotationDetail(saved.id));
    } catch (err) {
      const applied = applyServerErrors(form.setError, err, Object.keys(headerSchema.shape) as (keyof HeaderValues)[]);
      if (applied[0]) form.setFocus(applied[0]);
    } finally {
      setSubmitting(false);
    }
  };

  if (id && existing.isPending) {
    return <div className="mx-auto max-w-4xl space-y-4 p-4 lg:p-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 lg:p-6">
      <PageHeader title={id ? 'Sửa báo giá' : 'Tạo báo giá mới'} description="Đơn giá đã gồm VAT — đây là số khách sẽ trả." />

      {id && existing.isError ? (
        <QueryBoundary query={existing} errorTitle="Không tải được báo giá">{() => null}</QueryBoundary>
      ) : !isDraftOrNew ? (
        <Card><CardBody>Báo giá không còn ở trạng thái Nháp — mở trang chi tiết để xem hoặc thực hiện hành động.</CardBody></Card>
      ) : (
        <Form schema={headerSchema} defaultValues={defaultValues as HeaderValues} onSubmit={submit}>
          {(form) => (
            <div className="space-y-5">
              <Card><CardBody className="space-y-4">
                <h2 className="text-sm font-semibold">Thông tin người mua</h2>
                <OrganisationFields control={form.control} buyerType={form.watch('buyerType')} />
              </CardBody></Card>

              <Card><CardBody className="space-y-3">
                <h2 className="text-sm font-semibold">Danh sách sản phẩm</h2>
                <QuotationLineEditor lines={lines} onChange={setLines} />
              </CardBody></Card>

              <Card><CardBody className="space-y-4">
                <h2 className="text-sm font-semibold">Điều khoản</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField name="validUntil" control={form.control} type="date" label="Hiệu lực đến ngày (bỏ trống = mặc định 7 ngày)" />
                  <TextField name="paymentTermDays" control={form.control} type="number" label="Điều khoản thanh toán (số ngày, 0 = trả ngay)"
                    disabled={!canSellOnCredit} />
                </div>
                {!canSellOnCredit && (
                  <p className="text-xs text-fg-muted">
                    Bạn không có quyền bán trả sau (Sales.SellOnCredit) — điều khoản giữ ở 0 (trả ngay). Máy chủ còn từ chối
                    khi tính năng bán nợ đang tắt, số ngày vượt hạn mức, hoặc khách đang có công nợ quá hạn.
                  </p>
                )}
                <Textarea label="Điều khoản &amp; điều kiện (tuỳ chỉnh, để trống dùng mẫu mặc định)" rows={3} {...form.register('termsText')} />
                <Textarea label="Ghi chú nội bộ" rows={2} {...form.register('notes')} />
              </CardBody></Card>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate(paths.backoffice.quotationList())}>Huỷ</Button>
                <Button type="submit" loading={submitting}>{id ? 'Lưu' : 'Tạo báo giá'}</Button>
              </div>
            </div>
          )}
        </Form>
      )}
    </div>
  );
}
