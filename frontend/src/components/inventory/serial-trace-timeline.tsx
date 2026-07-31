import {
    ShoppingCart, PackageCheck, ArrowRightLeft, Bookmark, DollarSign,
    Shield, Wrench, RotateCcw, AlertTriangle, Trash2, Circle,
} from 'lucide-react';
import type { SerialTimelineEvent, SerialEventType } from '../../api/inventory';
import { Link } from 'react-router-dom';

interface Props {
    events: SerialTimelineEvent[];
    /** Serial gốc để render tiêu đề (optional). */
    serial?: string;
}

const iconMap: Record<SerialEventType, typeof Circle> = {
    Purchased: ShoppingCart,
    Received: PackageCheck,
    Transferred: ArrowRightLeft,
    Reserved: Bookmark,
    Sold: DollarSign,
    Warranty: Shield,
    Repair: Wrench,
    Returned: RotateCcw,
    Defective: AlertTriangle,
    Scrapped: Trash2,
};

const colorMap: Record<SerialEventType, string> = {
    Purchased: 'bg-blue-100 text-blue-700 ring-blue-200',
    Received: 'bg-green-100 text-green-700 ring-green-200',
    Transferred: 'bg-cyan-100 text-cyan-700 ring-cyan-200',
    Reserved: 'bg-purple-100 text-purple-700 ring-purple-200',
    Sold: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    Warranty: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
    Repair: 'bg-amber-100 text-amber-700 ring-amber-200',
    Returned: 'bg-orange-100 text-orange-700 ring-orange-200',
    Defective: 'bg-red-100 text-red-700 ring-red-200',
    Scrapped: 'bg-gray-200 text-gray-700 ring-gray-300',
};

const labelMap: Record<SerialEventType, string> = {
    Purchased: 'Mua từ NCC',
    Received: 'Nhập kho',
    Transferred: 'Chuyển kho',
    Reserved: 'Giữ chỗ',
    Sold: 'Đã bán',
    Warranty: 'Bảo hành',
    Repair: 'Sửa chữa',
    Returned: 'Khách trả',
    Defective: 'Chuyển kho lỗi',
    Scrapped: 'Thanh lý',
};

/**
 * Dòng thời gian dọc hiển thị vòng đời 1 serial:
 * Nhập từ NCC → Vào kho → (chuyển kho) → Bán → Bảo hành / sửa chữa / trả lại.
 */
export default function SerialTraceTimeline({ events, serial }: Props) {
    if (!events.length) {
        return (
            <div className="border border-dashed border-gray-300 rounded-xl bg-gray-50/50 p-10 text-center text-sm text-gray-500">
                Không tìm thấy dữ liệu cho serial này.
            </div>
        );
    }

    // Sắp xếp theo thời gian tăng dần (cũ nhất trước) để timeline có chiều đi
    const sorted = [...events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            {serial && (
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">Vòng đời serial</h3>
                    <span className="font-mono text-sm bg-gray-100 px-2.5 py-1 rounded-md">{serial}</span>
                </div>
            )}

            <div className="relative">
                {/* Đường dọc */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" aria-hidden="true" />

                <ol className="space-y-4">
                    {sorted.map((ev, idx) => {
                        const Icon = iconMap[ev.type] || Circle;
                        const color = colorMap[ev.type] || 'bg-gray-100 text-gray-600 ring-gray-200';
                        return (
                            <li key={`${ev.at}-${idx}`} className="relative pl-14">
                                <span className={`absolute left-0 top-1 w-10 h-10 rounded-full ring-4 ring-white ${color} flex items-center justify-center shadow-sm`}>
                                    <Icon size={18} />
                                </span>
                                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-gray-900">{labelMap[ev.type] || ev.type}</span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(ev.at).toLocaleString('vi-VN', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                    {ev.description && (
                                        <p className="text-sm text-gray-700">{ev.description}</p>
                                    )}
                                    {ev.ref && (
                                        <div className="mt-1 text-xs">
                                            {ev.refLink ? (
                                                <Link to={ev.refLink} className="text-[var(--accent-primary,#e11d48)] hover:underline font-medium">
                                                    {ev.ref}
                                                </Link>
                                            ) : (
                                                <span className="font-mono text-gray-600">{ev.ref}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </div>
    );
}
