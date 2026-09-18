/**
 * Đơn giữ ở quầy: khách đi rút tiền thì cất giỏ lại, phục vụ người tiếp theo, gọi ra sau.
 * Đơn giữ KHÔNG giữ tồn kho và KHÔNG phải đơn thật — giá được tính lại khi chốt.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { Button, Drawer, EmptyState, Money, QueryBoundary, Skeleton, notify } from '../../../components/ui';
import { useConfirm } from '../../../context/ConfirmContext';
import { salesPosApi, type PosHeldOrderHeader } from '../../../api/sales/pos';

interface PosHeldOrdersProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storeId?: string;
    onResume: (id: string) => void;
}

const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

export default function PosHeldOrders({ open, onOpenChange, storeId, onResume }: PosHeldOrdersProps) {
    const qc = useQueryClient();
    const confirm = useConfirm();

    const query = useQuery({
        queryKey: ['pos', 'held-orders', storeId],
        queryFn: () => salesPosApi.heldOrders.list({ storeId }),
        enabled: open && !!storeId,
    });

    const drop = async (row: PosHeldOrderHeader) => {
        const ok = await confirm({ message: `Xoá đơn giữ "${row.label}"?`, variant: 'danger' });
        if (!ok) return;
        try {
            await salesPosApi.heldOrders.remove(row.id);
            notify.success('Đã xoá đơn giữ');
            qc.invalidateQueries({ queryKey: ['pos', 'held-orders'] });
        } catch (err) {
            notify.error('Không xoá được đơn giữ', {
                description: (err as { normalized?: { message?: string } })?.normalized?.message,
            });
        }
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange} side="right" title="Đơn đang giữ">
            <QueryBoundary
                query={query}
                isEmpty={(d) => d.items.length === 0}
                skeleton={<div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>}
                empty={{ icon: Clock, title: 'Không có đơn nào đang giữ', description: 'Bấm "Giữ đơn" ở giỏ hàng để cất một giao dịch dở dang.' }}
            >
                {(data) => (
                    <ul className="space-y-3">
                        {data.items.map((row) => (
                            <li key={row.id} className="rounded-lg border border-line p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{row.label}</p>
                                        <p className="num text-xs text-fg-muted">{formatTime(row.createdAt)}</p>
                                        {row.customerName && <p className="truncate text-xs text-fg-muted">{row.customerName}</p>}
                                    </div>
                                    <Money value={row.estimatedTotal} className="text-sm" />
                                </div>
                                <div className="mt-2 flex gap-2">
                                    <Button size="sm" onClick={() => { onResume(row.id); onOpenChange(false); }}>Gọi ra</Button>
                                    <Button size="sm" variant="ghost" onClick={() => drop(row)}>Xoá</Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </QueryBoundary>
            {!storeId && <EmptyState title="Chưa xác định được kho bán" description="Không tải được kho của quầy nên không đọc được đơn giữ." />}
        </Drawer>
    );
}
