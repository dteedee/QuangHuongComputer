/**
 * "Chi tiết phiếu chuyển kho" — route `inventory/transfers/:id`. Header with the allowed actions,
 * the lines (shipped vs received, serials), and the status timeline.
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { inventoryTransfersApi, type TransferDetail } from '../../../../api/inventory-transfers';
import {
    Badge, Card, CardBody, ErrorState, PageHeader, QueryBoundary, SkeletonText, StatusBadge,
    Table, TBody, Td, Th, THead, Tr,
} from '../../../../components/ui';
import { transferStatusBadge } from './transfer-status-meta';
import { TransferStatusTimeline } from './transfer-status-timeline';
import { TransferActions } from './transfer-actions';
import { paths } from '../../../../routes';

export default function TransferDetailPage() {
    const { id } = useParams<{ id: string }>();
    const query = useQuery({
        queryKey: ['inventory', 'transfers', 'detail', id],
        queryFn: () => inventoryTransfersApi.get(id as string),
        enabled: Boolean(id),
    });

    if (!id) return <ErrorState title="Thiếu mã phiếu chuyển kho" />;

    return (
        <div className="px-4 py-4 lg:px-6">
            <QueryBoundary query={query} skeleton={<SkeletonText lines={8} />}>
                {(transfer) => <TransferDetailView transfer={transfer} />}
            </QueryBoundary>
        </div>
    );
}

function TransferDetailView({ transfer }: { transfer: TransferDetail }) {
    const received = transfer.status === 'Received';
    return (
        <div className="space-y-4">
            <PageHeader
                title={<span className="num">{transfer.transferNumber}</span>}
                description={`${transfer.fromWarehouse ?? '—'} → ${transfer.toWarehouse ?? '—'}`}
                breadcrumbs={[{ label: 'Chuyển kho', to: paths.backoffice.inventoryTransfers() }, { label: transfer.transferNumber }]}
                actions={<TransferActions transfer={transfer} />}
            >
                <div className="flex items-center gap-2 pb-1">
                    <StatusBadge {...transferStatusBadge(transfer.status)} />
                    {transfer.hasDiscrepancy && <Badge variant="danger">Nhận thiếu</Badge>}
                </div>
            </PageHeader>

            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                <Card>
                    <CardBody className="space-y-3">
                        <h2 className="text-base font-semibold text-fg">Hàng chuyển</h2>
                        <Table>
                            <THead>
                                <Tr>
                                    <Th>Sản phẩm</Th>
                                    <Th className="text-right">Xuất</Th>
                                    {received && <Th className="text-right">Nhận</Th>}
                                    <Th>Serial</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {transfer.items.map((line) => (
                                    <Tr key={line.id}>
                                        <Td>
                                            <div className="text-13 font-medium text-fg">{line.productName ?? '—'}</div>
                                            <div className="num text-2xs text-fg-subtle">{line.productSku}</div>
                                        </Td>
                                        <Td className="num text-right">{line.quantity}</Td>
                                        {received && (
                                            <Td className={line.shortage > 0 ? 'num text-right font-semibold text-danger' : 'num text-right'}>
                                                {line.receivedQuantity ?? '—'}
                                                {line.shortage > 0 && <span className="text-2xs"> (thiếu {line.shortage})</span>}
                                            </Td>
                                        )}
                                        <Td>
                                            {line.serialNumbers.length === 0
                                                ? <span className="text-fg-subtle">—</span>
                                                : <span className="num text-2xs text-fg-muted">{line.serialNumbers.join(', ')}</span>}
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                        {transfer.notes && <p className="text-13 text-fg-muted">Ghi chú: {transfer.notes}</p>}
                        {transfer.receiveNote && (
                            <p className="rounded-lg bg-danger-subtle px-3 py-2 text-13 text-danger">
                                Ghi chú khi nhận: {transfer.receiveNote}
                            </p>
                        )}
                    </CardBody>
                </Card>
                <Card className="xl:self-start">
                    <CardBody>
                        <h2 className="mb-3 text-base font-semibold text-fg">Tiến trình</h2>
                        <TransferStatusTimeline transfer={transfer} />
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
