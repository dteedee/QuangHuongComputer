import { useEffect, useState } from 'react';
import {
    MapPin,
    Store,
    X,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Phone,
    Clock,
} from 'lucide-react';
import {
    storeApi,
    getTodayHours,
    type StockByStore,
    type StockAvailability,
    type StoreDetail,
} from '../../api/store';

interface ProductStockByBranchProps {
    productId: string;
    /**
     * Không dùng ở API mới (backend gom theo product); giữ để không phá vỡ chỗ gọi
     * và có thể dùng cho các mở rộng sau (variantId).
     */
    variantId?: string;
}

interface AvailabilityMeta {
    label: string;
    cls: string;
    Icon: typeof CheckCircle2;
}

function availabilityMeta(a: StockAvailability): AvailabilityMeta {
    switch (a) {
        case 'InStock':
            return { label: 'Còn hàng', cls: 'text-emerald-700 bg-emerald-50 border-emerald-100', Icon: CheckCircle2 };
        case 'LowStock':
            return { label: 'Sắp hết', cls: 'text-amber-700 bg-amber-50 border-amber-200', Icon: AlertTriangle };
        case 'OutOfStock':
        default:
            return { label: 'Hết hàng', cls: 'text-red-600 bg-red-50 border-red-100', Icon: XCircle };
    }
}

/**
 * Hiển thị tình trạng tồn kho theo chi nhánh (định tính, KHÔNG lộ số lượng chính xác).
 *
 * Gọi `storeApi.getStockByProduct(productId)` — endpoint công khai chỉ trả nhãn
 * `InStock` / `LowStock` / `OutOfStock`.
 *
 * Khi bấm 1 chi nhánh, mở modal chi tiết: địa chỉ, SĐT, giờ mở cửa hôm nay
 * (nạp lười qua `storeApi.get(id)`).
 */
export default function ProductStockByBranch({ productId }: ProductStockByBranchProps) {
    const [items, setItems] = useState<StockByStore[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<StoreDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        storeApi
            .getStockByProduct(productId)
            .then(data => { if (!cancelled) setItems(data); })
            .catch(() => { if (!cancelled) setItems([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [productId]);

    // Nạp detail store khi chọn
    useEffect(() => {
        if (!selectedId) { setSelectedDetail(null); return; }
        let cancelled = false;
        setDetailLoading(true);
        setSelectedDetail(null);
        storeApi
            .get(selectedId)
            .then(d => { if (!cancelled) setSelectedDetail(d); })
            .catch(() => { if (!cancelled) setSelectedDetail(null); })
            .finally(() => { if (!cancelled) setDetailLoading(false); });
        return () => { cancelled = true; };
    }, [selectedId]);

    if (loading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-11 bg-gray-50 border border-gray-100 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-3 text-sm text-gray-600">
                Vui lòng chọn cửa hàng khi thanh toán.
            </div>
        );
    }

    const selectedItem = items.find(x => x.storeId === selectedId) ?? null;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Store className="w-4 h-4 text-gray-400" />
                <span>Tồn kho tại chi nhánh</span>
            </div>
            <ul className="space-y-1.5">
                {items.map(it => {
                    const meta = availabilityMeta(it.availability);
                    const Icon = meta.Icon;
                    return (
                        <li key={it.storeId}>
                            <button
                                type="button"
                                onClick={() => setSelectedId(it.storeId)}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-gray-100 bg-white hover:border-gray-300 transition-colors text-left cursor-pointer"
                            >
                                <span className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="truncate">{it.storeName}</span>
                                </span>
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${meta.cls}`}>
                                    <Icon className="w-3 h-3" />
                                    {meta.label}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>

            {selectedItem && (
                <StoreInfoModal
                    item={selectedItem}
                    detail={selectedDetail}
                    loading={detailLoading}
                    onClose={() => setSelectedId(null)}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface StoreInfoModalProps {
    item: StockByStore;
    detail: StoreDetail | null;
    loading: boolean;
    onClose: () => void;
}

function StoreInfoModal({ item, detail, loading, onClose }: StoreInfoModalProps) {
    const meta = availabilityMeta(item.availability);
    const Icon = meta.Icon;
    const address = detail
        ? [detail.address, detail.ward, detail.district, detail.province].filter(Boolean).join(', ')
        : '';
    const todayHours = detail ? getTodayHours(detail.openingHoursJson) : null;

    return (
        <div
            className="fixed inset-0 z-[150] bg-black/50 flex items-center justify-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-xl p-5 max-w-sm w-full shadow-xl relative"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
                    aria-label="Đóng"
                >
                    <X className="w-5 h-5" />
                </button>
                <h4 className="font-bold text-gray-900 mb-3 pr-6">{item.storeName}</h4>

                {loading ? (
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
                    </div>
                ) : detail ? (
                    <div className="space-y-2 text-sm">
                        <p className="flex items-start gap-2 text-gray-700">
                            <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                            <span>{address || 'Địa chỉ đang cập nhật'}</span>
                        </p>
                        {detail.phone && (
                            <p className="flex items-center gap-2 text-gray-700">
                                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <a
                                    href={`tel:${detail.phone}`}
                                    className="hover:text-[var(--accent-primary,#dc2626)]"
                                >
                                    {detail.phone}
                                </a>
                            </p>
                        )}
                        <p className="flex items-center gap-2 text-gray-700">
                            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            {todayHours && todayHours !== 'closed' ? (
                                <span>
                                    <span className="text-emerald-600 font-semibold">Hôm nay:</span> {todayHours}
                                </span>
                            ) : (
                                <span className="italic text-gray-500">Hôm nay: nghỉ</span>
                            )}
                        </p>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 italic">Không tải được chi tiết cửa hàng.</p>
                )}

                <div className="mt-4 pt-3 border-t border-gray-100">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold ${meta.cls}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                    </span>
                </div>
            </div>
        </div>
    );
}
