/**
 * Hành động "Giao hàng" — đơn vị vận chuyển + mã vận đơn, nhập tay (GHN chưa
 * bật / chưa cấu hình). Không dùng `window.prompt`.
 *
 * design-guidelines §9.3: overlay lấy từ `components/ui` (`Dialog`), không tự
 * dựng; nhãn trên ô, lỗi ngay dưới ô.
 */
import { useState } from 'react';
import { Truck } from 'lucide-react';
import { Button, Dialog, Input, Select } from '../../../components/ui';

interface OrderShipModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: { carrier: string; trackingNumber: string }) => void;
    isSubmitting: boolean;
}

const CARRIER_OPTIONS = ['GHN', 'GHTK', 'Viettel Post', 'J&T Express', 'Ninja Van', 'Tự vận chuyển']
    .map((c) => ({ value: c, label: c }));

export const OrderShipModal = ({ open, onClose, onSubmit, isSubmitting }: OrderShipModalProps) => {
    const [carrier, setCarrier] = useState(CARRIER_OPTIONS[0].value);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackingNumber.trim()) {
            setError('Vui lòng nhập mã vận đơn');
            return;
        }
        setError('');
        onSubmit({ carrier, trackingNumber: trackingNumber.trim() });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => { if (!o) onClose(); }}
            title="Giao hàng"
            description="Ghi nhận đơn vị vận chuyển và mã vận đơn trước khi chuyển đơn sang trạng thái Đang giao."
            size="sm"
        >
            <form id="order-ship-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
                <Select
                    label="Đơn vị vận chuyển"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    options={CARRIER_OPTIONS}
                />
                <Input
                    label="Mã vận đơn"
                    inputSize="sm"
                    placeholder="VD: GHN12345678"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    error={error || undefined}
                />
                <div className="mt-1 flex items-center justify-end gap-2 border-t border-line pt-3">
                    <Button type="button" variant="ghost" size="sm" onClick={onClose}>Huỷ</Button>
                    <Button type="submit" size="sm" icon={Truck} loading={isSubmitting}>
                        Xác nhận giao hàng
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};
