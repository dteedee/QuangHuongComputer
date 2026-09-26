import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, DollarSign } from 'lucide-react';
import {
    Button, Card, CardBody, CardHeader, CardTitle, Dialog, ErrorState, Money, PageHeader, QueryBoundary,
    SkeletonText, StatusBadge, Textarea, notify,
} from '../../../components/ui';
import { normalizeApiError } from '../../../lib/api-error';
import { paths } from '../../../routes';
import { queryKeys } from '../../../lib/query-keys';
import { repairApi, getWorkOrderStatusLabel, type ActivityLog, type WorkOrder, type WorkOrderPart, type WorkOrderStatus } from '../../../api/repair';
import { repairServiceTypesApi } from '../../../api/repair/service-types';
import type { RepairQuote } from '../../../api/repair/quote-types';
import { WorkOrderPaymentHandoverPanel } from './work-order-payment-handover-panel';
import { WorkOrderStatusActions } from './work-order-status-actions';
import { WorkOrderPartsCard } from './work-order-parts-card';
import { WorkOrderActivityCard } from './work-order-activity-card';
import { WorkOrderIntakePanel } from './intake/work-order-intake-panel';
import { WorkOrderAddPartDialog } from './intake/work-order-add-part-dialog';
import { WorkOrderProgressPhotosDialog } from './intake/work-order-progress-photos-dialog';
import { toAddPartInput } from './intake/work-order-part-schema';
import { WorkOrderQuotePanel } from './quote/work-order-quote-panel';
import { initialLines } from './quote/repair-quote-form-schema';

/** `GET /repair/tech/work-orders/{id}` — flat work order + parts, quotes (with lines) and activity logs. */
type TechWorkOrderDetail = WorkOrder & {
    serviceTypeName?: string | null;
    parts: WorkOrderPart[];
    quotes: RepairQuote[];
    activityLogs: ActivityLog[];
};

const CLOSED: WorkOrderStatus[] = ['Cancelled', 'Delivered'];
const PARTS_EDITABLE: WorkOrderStatus[] = ['Assigned', 'Diagnosed', 'Quoted', 'Approved', 'InProgress', 'OnHold'];

export const WorkOrderDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [partOpen, setPartOpen] = useState(false);
    const [photosOpen, setPhotosOpen] = useState(false);
    const [noteOpen, setNoteOpen] = useState(false);
    const [note, setNote] = useState('');

    const query = useQuery({
        queryKey: queryKeys.repair.detail(id ?? ''),
        queryFn: () => repairApi.technician.getWorkOrderDetail(id!) as Promise<TechWorkOrderDetail>,
        enabled: !!id,
    });
    const services = useQuery({ queryKey: [...queryKeys.repair.all, 'service-types', 'active'], queryFn: repairServiceTypesApi.listActive });
    const refetch = () => void query.refetch();
    const fail = (title: string) => (e: unknown) => notify.error(title, { description: normalizeApiError(e).message });

    const statusMutation = useMutation({
        mutationFn: ({ status, notes }: { status: WorkOrderStatus; notes?: string }) => repairApi.technician.updateStatus(id!, status, notes),
        onSuccess: () => { notify.success('Đã cập nhật trạng thái'); refetch(); },
        onError: fail('Không cập nhật được trạng thái'),
    });
    const removePart = useMutation({
        mutationFn: (partId: string) => repairApi.technician.removePart(id!, partId),
        onSuccess: () => { notify.success('Đã xoá linh kiện'); refetch(); },
        onError: fail('Không xoá được linh kiện'),
    });
    const addNote = useMutation({
        mutationFn: () => repairApi.technician.addLog(id!, note.trim()),
        onSuccess: () => { notify.success('Đã thêm ghi chú'); setNoteOpen(false); setNote(''); refetch(); },
        onError: fail('Không thêm được ghi chú'),
    });

    if (!id) return <ErrorState title="Thiếu mã phiếu sửa chữa" />;

    return (
        <div className="space-y-4 pb-16">
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate(paths.backoffice.tech())}>Quay lại</Button>
            <QueryBoundary query={query} skeleton={<SkeletonText lines={10} />} errorTitle="Không tải được phiếu sửa chữa">
                {(wo) => {
                    const currentQuote = wo.quotes.find((q) => q.id === wo.currentQuoteId) ?? null;
                    const editable = !CLOSED.includes(wo.status);
                    const partLines = initialLines({ parts: wo.parts }, []);
                    return (
                        <>
                            <PageHeader
                                title={<span className="num">{wo.ticketNumber}</span>}
                                description={<StatusBadge tone="info">{getWorkOrderStatusLabel(wo.status)}</StatusBadge>}
                                actions={<WorkOrderStatusActions status={wo.status} pending={statusMutation.isPending}
                                    onChange={(status, notes) => statusMutation.mutate({ status, notes })} />}
                            />
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                <div className="space-y-4 lg:col-span-2">
                                    <WorkOrderIntakePanel workOrder={wo} onChanged={refetch} editable={editable} />
                                    <WorkOrderPartsCard parts={wo.parts} partsCost={wo.partsCost} editable={PARTS_EDITABLE.includes(wo.status)}
                                        onAdd={() => setPartOpen(true)} onRemove={(partId) => removePart.mutate(partId)} />
                                    <WorkOrderQuotePanel workOrderId={wo.id} workOrderStatus={wo.status} currentQuote={currentQuote}
                                        initialLines={initialLines(wo, services.data ?? [])} partLines={wo.parts.length > 0 ? partLines : []} onChanged={refetch} />
                                    <WorkOrderActivityCard logs={wo.activityLogs} onAddNote={() => setNoteOpen(true)}
                                        onAddPhotos={editable ? () => setPhotosOpen(true) : undefined} />
                                </div>
                                <div className="space-y-4">
                                    <Card padded>
                                        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign size={18} aria-hidden /> Chi phí</CardTitle></CardHeader>
                                        <CardBody>
                                            <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-13">
                                                <dt className="text-fg-muted">Linh kiện</dt><dd className="text-right"><Money value={wo.partsCost} /></dd>
                                                <dt className="text-fg-muted">Nhân công</dt><dd className="text-right"><Money value={wo.laborCost} /></dd>
                                                <dt className="text-fg-muted">Phí dịch vụ</dt><dd className="text-right"><Money value={wo.serviceFee} /></dd>
                                                <dt className="border-t border-line pt-1 font-semibold">Theo báo giá đã duyệt</dt>
                                                <dd className="border-t border-line pt-1 text-right font-semibold">
                                                    <Money value={currentQuote?.status === 'Approved' ? currentQuote.totalCost : null} />
                                                </dd>
                                            </dl>
                                        </CardBody>
                                    </Card>
                                    <WorkOrderPaymentHandoverPanel workOrder={wo} workOrderId={wo.id} refetch={refetch} />
                                </div>
                            </div>
                        </>
                    );
                }}
            </QueryBoundary>

            <WorkOrderAddPartDialog open={partOpen} onOpenChange={setPartOpen}
                onSubmit={async (values) => {
                    await repairApi.technician.addPart(id, toAddPartInput(values));
                    notify.success(values.source === 'stock' ? 'Đã thêm và giữ hàng linh kiện' : 'Đã thêm linh kiện mua ngoài');
                    refetch();
                }} />
            <WorkOrderProgressPhotosDialog open={photosOpen} onOpenChange={setPhotosOpen} workOrderId={id} onUploaded={refetch} />
            <Dialog open={noteOpen} onOpenChange={setNoteOpen} title="Thêm ghi chú" size="sm"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setNoteOpen(false)}>Huỷ</Button>
                        <Button loading={addNote.isPending} disabled={!note.trim()} onClick={() => addNote.mutate()}>Thêm ghi chú</Button>
                    </div>
                }>
                <Textarea label="Nội dung" rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
            </Dialog>
        </div>
    );
};

export default WorkOrderDetailPage;
