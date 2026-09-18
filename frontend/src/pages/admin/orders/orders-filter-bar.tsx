/**
 * Search + server-side filters bar for the orders list (phase spec step 1).
 * Split out of `OrdersPage.tsx` to keep that file under 200 LOC (W3-10).
 */
import { Calendar, KanbanSquare, LayoutList, RefreshCw, Search, X } from 'lucide-react';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';

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
    { value: 'Cancelled', label: 'Đã hủy' },
];

const PAYMENT_STATUS_OPTIONS = [
    { value: 'all', label: 'Thanh toán' },
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

export const OrdersFilterBar = ({ filters, onChange, onReset, hasActiveFilters, viewMode, onViewModeChange }: OrdersFilterBarProps) => (
    <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-100 dark:border-gray-800 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row items-stretch gap-4">
            <div className="relative flex-1 group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors" size={20} />
                <input
                    type="text"
                    placeholder="Tìm theo mã đơn hàng, số điện thoại…"
                    value={filters.search}
                    onChange={(e) => onChange('search', e.target.value)}
                    className="w-full pl-14 pr-10 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm font-bold text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-accent/10 transition-all outline-none placeholder:text-gray-400"
                />
                {filters.search && (
                    <button onClick={() => onChange('search', '')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <SearchableSelect value={filters.status} onChange={(val: string) => onChange('status', val)} options={STATUS_OPTIONS} />
                <SearchableSelect value={filters.paymentStatus} onChange={(val: string) => onChange('paymentStatus', val)} options={PAYMENT_STATUS_OPTIONS} />
                <SearchableSelect value={filters.channel} onChange={(val: string) => onChange('channel', val)} options={CHANNEL_OPTIONS} />

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input type="date" value={filters.dateRange.from} onChange={(e) => onChange('dateRange', { ...filters.dateRange, from: e.target.value })}
                            className={`pl-9 pr-3 py-4 border rounded-xl text-xs font-bold outline-none cursor-pointer transition-all ${filters.dateRange.from ? 'bg-accent/5 border-accent/20 text-accent' : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300'}`} />
                    </div>
                    <span className="text-gray-400">-</span>
                    <input type="date" value={filters.dateRange.to} onChange={(e) => onChange('dateRange', { ...filters.dateRange, to: e.target.value })}
                        className={`px-3 py-4 border rounded-xl text-xs font-bold outline-none cursor-pointer transition-all ${filters.dateRange.to ? 'bg-accent/5 border-accent/20 text-accent' : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300'}`} />
                </div>

                {hasActiveFilters && (
                    <button onClick={onReset} className="flex items-center gap-2 px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-accent hover:bg-blue-50 rounded-xl transition-all">
                        <RefreshCw size={14} /> Đặt lại
                    </button>
                )}

                <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl shadow-inner border border-gray-200 dark:border-gray-700">
                    <button onClick={() => onViewModeChange('list')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-900 text-accent shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
                        <LayoutList size={16} /> Bảng
                    </button>
                    <button onClick={() => onViewModeChange('kanban')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-900 text-accent shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
                        <KanbanSquare size={16} /> Kanban
                    </button>
                </div>
            </div>
        </div>
    </div>
);
