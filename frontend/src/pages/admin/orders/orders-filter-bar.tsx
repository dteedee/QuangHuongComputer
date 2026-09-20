/**
 * Thanh tìm kiếm + bộ lọc phía máy chủ của danh sách đơn hàng.
 * Tách khỏi `OrdersPage.tsx` để file đó dưới 200 dòng (W3-10).
 *
 * design-guidelines §9.1/§9.2: chỉ token (`bg-surface` / `text-fg` /
 * `border-line`), ô nhập `h-9`, nhãn nằm TRÊN ô. Không hex, không `gray-*`.
 * Chữ ký props giữ NGUYÊN vì `OrdersPage.tsx` (track khác) đang gọi.
 */
import { KanbanSquare, LayoutList, RefreshCw, Search } from 'lucide-react';
import { Button, Card, Input, Select, Tabs, TabList, Tab } from '../../../components/ui';

export interface OrderFilters {
    search: string;
    status: string;
    paymentStatus: string;
    channel: string;
    dateRange: { from: string; to: string };
}

interface OrdersFilterBarProps {
    filters: OrderFilters;
    onChange: (key: keyof OrderFilters, value: any) => void;
    onReset: () => void;
    hasActiveFilters: boolean;
    viewMode: 'list' | 'kanban';
    onViewModeChange: (mode: 'list' | 'kanban') => void;
}

const STATUS_OPTIONS = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'Draft', label: 'Bản nháp' },
    { value: 'Pending', label: 'Chờ xác nhận' },
    { value: 'Confirmed', label: 'Đã xác nhận' },
    { value: 'Fulfilled', label: 'Đã đóng gói' },
    { value: 'Shipped', label: 'Đang giao' },
    { value: 'Delivered', label: 'Đã giao' },
    { value: 'Completed', label: 'Hoàn tất' },
    { value: 'Cancelled', label: 'Đã huỷ' },
];

const PAYMENT_STATUS_OPTIONS = [
    { value: 'all', label: 'Mọi tình trạng thanh toán' },
    { value: 'Pending', label: 'Chờ thanh toán' },
    { value: 'PartiallyPaid', label: 'Đã cọc một phần' },
    { value: 'Paid', label: 'Đã thanh toán' },
    { value: 'Failed', label: 'Thất bại' },
    { value: 'Refunded', label: 'Hoàn tiền' },
];

const CHANNEL_OPTIONS = [
    { value: 'all', label: 'Tất cả kênh' },
    { value: 'Web', label: 'Website' },
    { value: 'Pos', label: 'Tại quầy' },
    { value: 'Guest', label: 'Khách vãng lai' },
    { value: 'Quotation', label: 'Báo giá' },
];

export const OrdersFilterBar = ({
    filters, onChange, onReset, hasActiveFilters, viewMode, onViewModeChange,
}: OrdersFilterBarProps) => (
    <Card padded radius="xl">
        <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <Input
                    label="Tìm đơn hàng"
                    icon={Search}
                    inputSize="sm"
                    className="xl:col-span-2"
                    placeholder="Mã đơn hàng hoặc số điện thoại…"
                    value={filters.search}
                    onChange={(e) => onChange('search', e.target.value)}
                />
                <Select
                    label="Trạng thái đơn"
                    value={filters.status}
                    onChange={(e) => onChange('status', e.target.value)}
                    options={STATUS_OPTIONS}
                />
                <Select
                    label="Thanh toán"
                    value={filters.paymentStatus}
                    onChange={(e) => onChange('paymentStatus', e.target.value)}
                    options={PAYMENT_STATUS_OPTIONS}
                />
                <Select
                    label="Kênh bán"
                    value={filters.channel}
                    onChange={(e) => onChange('channel', e.target.value)}
                    options={CHANNEL_OPTIONS}
                />
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-wrap items-end gap-3">
                    <Input
                        type="date"
                        label="Từ ngày"
                        inputSize="sm"
                        value={filters.dateRange.from}
                        onChange={(e) => onChange('dateRange', { ...filters.dateRange, from: e.target.value })}
                    />
                    <Input
                        type="date"
                        label="Đến ngày"
                        inputSize="sm"
                        value={filters.dateRange.to}
                        onChange={(e) => onChange('dateRange', { ...filters.dateRange, to: e.target.value })}
                    />
                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onReset}>
                            Đặt lại bộ lọc
                        </Button>
                    )}
                </div>

                <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as 'list' | 'kanban')}>
                    <TabList aria-label="Kiểu hiển thị danh sách đơn hàng" className="border-b-0">
                        <Tab value="list">
                            <LayoutList size={15} aria-hidden /> Bảng
                        </Tab>
                        <Tab value="kanban">
                            <KanbanSquare size={15} aria-hidden /> Kanban
                        </Tab>
                    </TabList>
                </Tabs>
            </div>
        </div>
    </Card>
);
