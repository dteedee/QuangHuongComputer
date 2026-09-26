/**
 * Printable repair quote (A4) for walk-in customers who sign on paper. Uses the
 * staff-visible `GET /repair/quotes/{id}`; every number is the server's
 * snapshot, rendered through the shared `RepairQuoteBreakdown`.
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { repairPublicApi } from '../../../../api/repair/public';
import { useCompanyInfo } from '../../../../hooks/use-company-info';
import { PrintPageShell } from '../../../../components/print/print-page-shell';
import { ErrorState, QueryBoundary, Skeleton } from '../../../../components/ui';
import { RepairQuoteBreakdown } from '../../../../components/repair/repair-quote-breakdown';
import { breakdownFromQuote } from '../../../../components/repair/repair-quote-breakdown-adapters';
import { queryKeys } from '../../../../lib/query-keys';

const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—');

export default function RepairQuotePrintPage() {
    const { id } = useParams<{ id: string }>();
    const { companyInfo } = useCompanyInfo();
    const quoteQuery = useQuery({
        queryKey: [...queryKeys.repair.details(), 'quote', id, 'print'],
        queryFn: () => repairPublicApi.quotes.get(id as string),
        enabled: !!id,
    });

    if (!id) return <ErrorState title="Thiếu mã báo giá" />;

    return (
        <PrintPageShell title="In báo giá sửa chữa">
            <div className="mx-auto max-w-[210mm] px-4 print-doc">
                <QueryBoundary query={quoteQuery} skeleton={<Skeleton className="h-[280mm] w-full" />} errorTitle="Không tải được báo giá để in">
                    {(q) => (
                        <div className="space-y-6 bg-surface p-8 text-sm">
                            <header className="flex items-start justify-between border-b border-line pb-4">
                                <div>
                                    <div className="text-base font-bold">{companyInfo.name}</div>
                                    <div>MST: {companyInfo.taxCode}</div>
                                    <div>{companyInfo.address}</div>
                                    <div>{companyInfo.phone} · {companyInfo.email}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold">BÁO GIÁ SỬA CHỮA</div>
                                    <div className="num">{q.quoteNumber}</div>
                                    <div>Ngày lập: {date(q.createdAt)}</div>
                                    <div>Hiệu lực đến: {date(q.validUntil)}</div>
                                </div>
                            </header>
                            {q.description && <p><span className="font-semibold">Công việc: </span>{q.description}</p>}
                            <RepairQuoteBreakdown {...breakdownFromQuote(q)} />
                            {q.notes && <p className="text-fg-muted">{q.notes}</p>}
                            <section className="grid grid-cols-2 gap-8 pt-8 text-center">
                                <div><div className="font-semibold">Khách hàng đồng ý</div><div className="text-xs text-fg-muted">(Ký, ghi rõ họ tên)</div></div>
                                <div><div className="font-semibold">Kỹ thuật viên</div><div className="text-xs text-fg-muted">(Ký, ghi rõ họ tên)</div></div>
                            </section>
                        </div>
                    )}
                </QueryBoundary>
            </div>
        </PrintPageShell>
    );
}
