import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { salesAdminOrdersApi } from '../../../api/sales/admin-orders';
import { useCompanyLetterhead } from '../../../components/print/use-company-letterhead';
import { DepositReceiptA6 } from '../../../components/print/deposit-receipt-a6';
import { PrintPageShell } from '../../../components/print/print-page-shell';
import { QueryBoundary, ErrorState, Skeleton } from '../../../components/ui';

/** Route `print/deposit-receipt/:orderId?paymentId=`. Without `paymentId` (e.g. reached from a
 *  bookmark) it falls back to the order's latest non-reversed payment — still real data, never
 *  a placeholder amount. */
export default function DepositReceiptPage() {
    const { orderId } = useParams<{ orderId: string }>();
    const [search] = useSearchParams();
    const paymentId = search.get('paymentId');
    const orderQuery = useQuery({
        queryKey: ['bulk-tools', 'order-detail', orderId],
        queryFn: () => salesAdminOrdersApi.getDetail(orderId as string),
        enabled: !!orderId,
    });
    const companyQuery = useCompanyLetterhead();

    if (!orderId) return <ErrorState title="Thiếu mã đơn hàng" />;

    return (
        <PrintPageShell title="Phiếu thu tiền đặt cọc">
            <div className="mx-auto max-w-3xl px-4">
                <QueryBoundary query={orderQuery} skeleton={<Skeleton className="mx-auto h-[148mm] w-[105mm]" />}>
                    {(order) => {
                        const payment = paymentId
                            ? order.payments.find((p) => p.id === paymentId)
                            : [...order.payments].filter((p) => !p.isReversed).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
                        if (!payment) {
                            return <ErrorState title="Không tìm thấy lần thu tiền" description="Đơn này chưa có lần thu tiền nào để in phiếu." />;
                        }
                        return (
                            <QueryBoundary query={companyQuery} skeleton={<Skeleton className="h-6 w-64" />}>
                                {(company) => <DepositReceiptA6 order={order} payment={payment} company={company} />}
                            </QueryBoundary>
                        );
                    }}
                </QueryBoundary>
            </div>
        </PrintPageShell>
    );
}
