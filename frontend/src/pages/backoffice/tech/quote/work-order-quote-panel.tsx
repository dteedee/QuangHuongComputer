import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FileText, Pencil, Printer, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, CardTitle, StatusBadge, notify } from '../../../../components/ui';
import { RepairQuoteBreakdown } from '../../../../components/repair/repair-quote-breakdown';
import { breakdownFromQuote } from '../../../../components/repair/repair-quote-breakdown-adapters';
import { normalizeApiError } from '../../../../lib/api-error';
import { paths } from '../../../../routes';
import { repairAdminApi } from '../../../../api/repair/admin';
import type { RepairQuote } from '../../../../api/repair/quote-types';
import type { QuoteStatus, WorkOrderStatus } from '../../../../api/repair/types';
import { RepairQuoteEditorDialog } from './repair-quote-editor-dialog';
import type { RepairQuoteLineValues } from './repair-quote-form-schema';

const QUOTE_STATUS: Record<QuoteStatus, { tone: 'warning' | 'success' | 'danger' | 'neutral'; label: string }> = {
    Pending: { tone: 'warning', label: 'Chờ khách duyệt' },
    Approved: { tone: 'success', label: 'Khách đã đồng ý' },
    Rejected: { tone: 'danger', label: 'Khách từ chối' },
    Expired: { tone: 'neutral', label: 'Hết hạn' },
};

interface Props {
    workOrderId: string;
    workOrderStatus: WorkOrderStatus;
    currentQuote: RepairQuote | null;
    initialLines: RepairQuoteLineValues[];
    partLines: RepairQuoteLineValues[];
    onChanged: () => void;
}

/** Current quote of a work order + create / edit / send-to-customer / print actions. */
export function WorkOrderQuotePanel({ workOrderId, workOrderStatus, currentQuote, initialLines, partLines, onChanged }: Props) {
    const navigate = useNavigate();
    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState<RepairQuote | null>(null);

    const send = useMutation({
        mutationFn: (quoteId: string) => repairAdminApi.quotes.markAwaitingApproval(quoteId),
        onSuccess: () => { notify.success('Đã gửi báo giá cho khách duyệt'); onChanged(); },
        onError: (e) => notify.error('Không gửi được báo giá', { description: normalizeApiError(e).message }),
    });

    const canCreate = workOrderStatus === 'Diagnosed' || workOrderStatus === 'Quoted';
    const canEdit = currentQuote?.status === 'Pending' && workOrderStatus === 'Quoted';
    if (!currentQuote && !canCreate) return null;

    const openEditor = (quote: RepairQuote | null) => { setEditing(quote); setEditorOpen(true); };

    return (
        <Card padded>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                    <FileText size={18} aria-hidden /> Báo giá {currentQuote && <span className="num text-fg-muted">{currentQuote.quoteNumber}</span>}
                    {currentQuote && <StatusBadge tone={QUOTE_STATUS[currentQuote.status].tone}>{QUOTE_STATUS[currentQuote.status].label}</StatusBadge>}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                    {currentQuote && (
                        <Button variant="ghost" size="sm" icon={Printer} onClick={() => navigate(paths.backoffice.techQuotePrint(currentQuote.id))}>In</Button>
                    )}
                    {canEdit && <Button variant="outline" size="sm" icon={Pencil} onClick={() => openEditor(currentQuote)}>Sửa báo giá</Button>}
                    {canEdit && (
                        <Button size="sm" icon={Send} loading={send.isPending} onClick={() => send.mutate(currentQuote!.id)}>Gửi khách duyệt</Button>
                    )}
                    {canCreate && !canEdit && <Button size="sm" icon={FileText} onClick={() => openEditor(null)}>Tạo báo giá</Button>}
                </div>
            </CardHeader>
            <CardBody>
                {currentQuote
                    ? <RepairQuoteBreakdown {...breakdownFromQuote(currentQuote)} />
                    : <p className="text-13 text-fg-muted">Chưa có báo giá. Tạo báo giá theo từng dòng linh kiện, công sửa và dịch vụ để gửi khách duyệt.</p>}
                {currentQuote?.rejectionReason && <p className="mt-2 text-13 text-danger">Lý do từ chối: {currentQuote.rejectionReason}</p>}
            </CardBody>
            <RepairQuoteEditorDialog open={editorOpen} onOpenChange={setEditorOpen} workOrderId={workOrderId} editing={editing}
                initialLines={initialLines} partLines={partLines} onSaved={onChanged} />
        </Card>
    );
}
