import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { inventoryTransfersApi } from '../../../../api/inventory-transfers';
import { useCompanyLetterhead } from '../../../../components/print/use-company-letterhead';
import { PrintPageShell } from '../../../../components/print/print-page-shell';
import { TransferSlipA5 } from '../../../../components/print/transfer-slip-a5';
import { ErrorState, QueryBoundary, Skeleton } from '../../../../components/ui';

/** Route `inventory/transfers/:id/print` — A5 transfer slip, same shell as the delivery note. */
export default function TransferPrintPage() {
    const { id } = useParams<{ id: string }>();
    const transferQuery = useQuery({
        queryKey: ['inventory', 'transfers', 'detail', id],
        queryFn: () => inventoryTransfersApi.get(id as string),
        enabled: Boolean(id),
    });
    const companyQuery = useCompanyLetterhead();

    if (!id) return <ErrorState title="Thiếu mã phiếu chuyển kho" />;

    return (
        <PrintPageShell title="Phiếu chuyển kho">
            <div className="mx-auto max-w-3xl px-4">
                <QueryBoundary query={transferQuery} skeleton={<Skeleton className="mx-auto h-[210mm] w-[148mm]" />}>
                    {(transfer) => (
                        <QueryBoundary query={companyQuery} skeleton={<Skeleton className="h-6 w-64" />}>
                            {(company) => <TransferSlipA5 transfer={transfer} company={company} />}
                        </QueryBoundary>
                    )}
                </QueryBoundary>
            </div>
        </PrintPageShell>
    );
}
