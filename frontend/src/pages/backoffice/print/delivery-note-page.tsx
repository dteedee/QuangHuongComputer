import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { salesAdminOrdersApi } from '../../../api/sales/admin-orders';
import { useCompanyLetterhead } from '../../../components/print/use-company-letterhead';
import { DeliveryNoteA5 } from '../../../components/print/delivery-note-a5';
import { PrintPageShell } from '../../../components/print/print-page-shell';
import { QueryBoundary, ErrorState, Skeleton } from '../../../components/ui';

/** Route `print/delivery-note/:orderId` — A5 delivery note for an existing order
 *  (`docs/api-contracts/sales-pos-returns-loyalty.md` §4 detail shape). */
export default function DeliveryNotePage() {
    const { orderId } = useParams<{ orderId: string }>();
    const orderQuery = useQuery({
        queryKey: ['bulk-tools', 'order-detail', orderId],
        queryFn: () => salesAdminOrdersApi.getDetail(orderId as string),
        enabled: !!orderId,
    });
    const companyQuery = useCompanyLetterhead();

    if (!orderId) return <ErrorState title="Thiếu mã đơn hàng" />;

    return (
        <PrintPageShell title="Phiếu giao hàng">
            <div className="mx-auto max-w-3xl px-4">
                <QueryBoundary
                    query={orderQuery}
                    skeleton={<Skeleton className="mx-auto h-[210mm] w-[148mm]" />}
                >
                    {(order) => (
                        <QueryBoundary query={companyQuery} skeleton={<Skeleton className="h-6 w-64" />}>
                            {(company) => <DeliveryNoteA5 order={order} company={company} />}
                        </QueryBoundary>
                    )}
                </QueryBoundary>
            </div>
        </PrintPageShell>
    );
}
