/**
 * Quotation print view (Implementation Steps #4). Uses the same detail
 * fetch as the detail page rather than `GET /{id}/print` — the print
 * endpoint's own persistence was not yet wired at hand-off (contract's
 * "Trạng thái tại bàn giao"), so this derives the VAT breakdown by grouping
 * the quotation's own per-line `vatRate`/`netAmount`/`vatAmount` (already
 * computed server-side, D01) — no client-side tax computation, just a
 * re-group of numbers the server already returned. Company block from
 * `useCompanyInfo()` per the phase file, independent of the quotations
 * backend so printing still works even while that endpoint is unstable.
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { quotationsApi, type QuotationDto } from '../../../api/sales/quotations';
import { useCompanyInfo } from '../../../hooks/use-company-info';
import { PrintPageShell } from '../../../components/print/print-page-shell';
import { QueryBoundary, ErrorState, Skeleton } from '../../../components/ui';

function buildVatBreakdown(q: QuotationDto) {
  const byRate = new Map<number, { net: number; vat: number }>();
  for (const line of q.lines) {
    const row = byRate.get(line.vatRate) ?? { net: 0, vat: 0 };
    row.net += line.netAmount; row.vat += line.vatAmount;
    byRate.set(line.vatRate, row);
  }
  return [...byRate.entries()].map(([rate, v]) => ({ rate, ...v })).sort((a, b) => a.rate - b.rate);
}

export default function QuotationPrintPage() {
  const { id } = useParams<{ id: string }>();
  const { companyInfo } = useCompanyInfo();
  const quotationQuery = useQuery({
    queryKey: ['quotation', id, 'print'],
    queryFn: () => quotationsApi.getById(id as string),
    enabled: !!id,
  });

  if (!id) return <ErrorState title="Thiếu mã báo giá" />;

  return (
    <PrintPageShell title="In báo giá">
      <div className="mx-auto max-w-[210mm] px-4 print-doc">
        <QueryBoundary query={quotationQuery} skeleton={<Skeleton className="h-[280mm] w-full" />} errorTitle="Không tải được báo giá để in">
          {(q) => {
            const vatBreakdown = buildVatBreakdown(q);
            return (
              <div className="space-y-6 bg-surface p-8 text-sm">
                <header className="flex items-start justify-between border-b border-line pb-4">
                  <div>
                    <div className="text-base font-bold">{companyInfo.name}</div>
                    <div>MST: {companyInfo.taxCode}</div>
                    <div>{companyInfo.address}</div>
                    <div>{companyInfo.phone} · {companyInfo.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">BÁO GIÁ</div>
                    <div className="num">{q.quotationNumber}</div>
                    <div>Hiệu lực đến: {q.validUntil ? new Date(q.validUntil).toLocaleDateString('vi-VN') : '—'}</div>
                  </div>
                </header>

                <section>
                  <h2 className="font-semibold">Kính gửi</h2>
                  <div>{q.buyerLegalName}</div>
                  {q.buyerTaxCode && <div>MST: {q.buyerTaxCode}</div>}
                  {q.buyerBudgetUnitCode && <div>Mã ĐVQHNS: {q.buyerBudgetUnitCode}</div>}
                  {q.buyerAddress && <div>{q.buyerAddress}</div>}
                  <div>Người liên hệ: {q.customerName} {q.customerPhone && `- ${q.customerPhone}`}</div>
                </section>

                <table className="w-full border border-line text-left">
                  <thead>
                    <tr className="border-b border-line bg-surface-subtle">
                      <th className="p-2">Sản phẩm</th>
                      <th className="p-2 text-right">SL</th>
                      <th className="p-2 text-right">Đơn giá (gồm VAT)</th>
                      <th className="p-2 text-right">Giảm giá</th>
                      <th className="p-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.lines.map((l) => (
                      <tr key={l.id} className="border-b border-line">
                        <td className="p-2">{l.productName} <span className="num text-fg-muted">({l.productSku})</span></td>
                        <td className="p-2 text-right num">{l.quantity}</td>
                        <td className="p-2 text-right num">{l.unitPrice.toLocaleString('vi-VN')}đ</td>
                        <td className="p-2 text-right num">{l.lineDiscount.toLocaleString('vi-VN')}đ</td>
                        <td className="p-2 text-right num">{l.lineTotal.toLocaleString('vi-VN')}đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <section className="flex justify-end">
                  <div className="w-64 space-y-1">
                    <div className="flex justify-between"><span>Tạm tính</span><span className="num">{q.subtotalAmount.toLocaleString('vi-VN')}đ</span></div>
                    <div className="flex justify-between"><span>Giảm giá</span><span className="num">-{q.discountAmount.toLocaleString('vi-VN')}đ</span></div>
                    {vatBreakdown.map((row) => (
                      <div key={row.rate} className="flex justify-between text-fg-muted">
                        <span>Trong đó VAT ({(row.rate * 100).toFixed(0)}%)</span><span className="num">{row.vat.toLocaleString('vi-VN')}đ</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-line pt-1 text-base font-bold">
                      <span>Tổng cộng</span><span className="num">{q.totalAmount.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="text-xs text-fg-muted">Giá đã bao gồm VAT.</div>
                  </div>
                </section>

                <section>
                  <h2 className="font-semibold">Điều khoản thanh toán &amp; điều kiện</h2>
                  <p>{q.paymentTermDays > 0 ? `Thanh toán trong vòng ${q.paymentTermDays} ngày kể từ ngày giao hàng.` : 'Thanh toán ngay khi nhận hàng.'}</p>
                  <p>{q.termsText || 'Báo giá có hiệu lực đến ngày ghi trên phiếu. Giá có thể thay đổi theo thị trường sau thời hạn này.'}</p>
                </section>
              </div>
            );
          }}
        </QueryBoundary>
      </div>
    </PrintPageShell>
  );
}
