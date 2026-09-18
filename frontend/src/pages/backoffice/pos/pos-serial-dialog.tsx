/**
 * Chọn serial cho hàng quản lý theo serial. Số serial phải bằng số lượng bán — server ghi
 * đúng những serial này vào đơn, nên chọn nhầm = bảo hành sai máy.
 */
import { useQuery } from '@tanstack/react-query';
import { ScanBarcode } from 'lucide-react';
import { Badge, Button, Checkbox, Dialog, QueryBoundary, Skeleton } from '../../../components/ui';
import { fetchAvailableSerials } from './pos-catalog-lookup';

interface PosSerialDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productId?: string;
    productName?: string;
    quantity: number;
    warehouseId?: string;
    selected: string[];
    onChange: (serials: string[]) => void;
}

export default function PosSerialDialog({
    open, onOpenChange, productId, productName, quantity, warehouseId, selected, onChange,
}: PosSerialDialogProps) {
    const query = useQuery({
        queryKey: ['pos', 'serials', productId, warehouseId],
        queryFn: () => fetchAvailableSerials(productId!, warehouseId),
        enabled: open && !!productId,
    });

    const toggle = (serial: string) => {
        if (selected.includes(serial)) onChange(selected.filter((s) => s !== serial));
        else if (selected.length < quantity) onChange([...selected, serial]);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            title={`Chọn serial — ${productName ?? ''}`}
            description={`Cần ${quantity} serial, đã chọn ${selected.length}`}
            size="md"
            footer={
                <Button onClick={() => onOpenChange(false)} disabled={selected.length !== quantity}>
                    Xong
                </Button>
            }
        >
            <QueryBoundary
                query={query}
                isEmpty={(d) => d.length === 0}
                skeleton={<div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>}
                empty={{
                    icon: ScanBarcode,
                    title: 'Kho không còn serial nào của mặt hàng này',
                    description: 'Nhập serial khi nhận hàng (phiếu nhập kho) rồi quay lại quầy.',
                }}
            >
                {(rows) => (
                    <ul className="space-y-1">
                        {rows.map((row) => (
                            <li key={row.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2">
                                <Checkbox
                                    label={row.serial}
                                    checked={selected.includes(row.serial)}
                                    onChange={() => toggle(row.serial)}
                                />
                                <Badge variant="neutral">{row.status}</Badge>
                            </li>
                        ))}
                    </ul>
                )}
            </QueryBoundary>
        </Dialog>
    );
}
