import { useEffect, useState } from 'react';
import { MapPin, Store, X } from 'lucide-react';
import { catalogApi, type StockByBranch } from '../../api/catalog';

interface ProductStockByBranchProps {
    productId: string;
    variantId?: string;
    /** Cho phép truyền vào từ ngoài để tránh gọi API 2 lần. */
    initialData?: StockByBranch[];
}

function statusFor(qty: number) {
    if (qty > 5) return { label: 'Còn hàng', cls: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
    if (qty > 0) return { label: `Sắp hết (${qty})`, cls: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Hết hàng', cls: 'text-red-600 bg-red-50 border-red-100' };
}

/**
 * Hiển thị tồn kho theo chi nhánh. Bấm chi nhánh → mở modal địa chỉ + giờ mở cửa.
 * Nếu backend chưa có địa chỉ (Warehouse entity chưa mở rộng), hiển thị placeholder.
 */
export default function ProductStockByBranch({
    productId, variantId, initialData,
}: ProductStockByBranchProps) {
    const [items, setItems] = useState<StockByBranch[]>(initialData || []);
    const [loading, setLoading] = useState(!initialData);
    const [selected, setSelected] = useState<StockByBranch | null>(null);

    useEffect(() => {
        if (initialData) { setItems(initialData); return; }
        let cancelled = false;
        setLoading(true);
        catalogApi
            .getStockByBranch(productId, variantId)
            .then((data) => { if (!cancelled) setItems(Array.isArray(data) ? data : []); })
            .catch(() => { if (!cancelled) setItems([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [productId, variantId, initialData]);

    if (loading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-11 bg-gray-50 border border-gray-100 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <p className="text-xs text-gray-500 italic">
                Chưa có dữ liệu tồn kho theo chi nhánh.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Store className="w-4 h-4 text-gray-400" />
                <span>Tồn kho tại chi nhánh</span>
            </div>
            <ul className="space-y-1.5">
                {items.map((it) => {
                    const s = statusFor(it.quantity);
                    return (
                        <li key={it.warehouseId}>
                            <button
                                type="button"
                                onClick={() => setSelected(it)}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-gray-100 bg-white hover:border-gray-300 transition-colors text-left cursor-pointer"
                            >
                                <span className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="truncate">{it.warehouseName}</span>
                                </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${s.cls}`}>
                                    {s.label}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>

            {selected && (
                <div
                    className="fixed inset-0 z-[150] bg-black/50 flex items-center justify-center p-4"
                    onClick={() => setSelected(null)}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-xl p-5 max-w-sm w-full shadow-xl relative"
                    >
                        <button
                            type="button"
                            onClick={() => setSelected(null)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
                            aria-label="Đóng"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h4 className="font-bold text-gray-900 mb-2">{selected.warehouseName}</h4>
                        <p className="text-sm text-gray-600 mb-2">
                            <MapPin className="w-4 h-4 inline mr-1 -mt-0.5 text-gray-400" />
                            {selected.address || 'Địa chỉ đang cập nhật'}
                        </p>
                        <p className="text-sm text-gray-600">
                            Giờ mở cửa: {selected.openingHours || '08:00 - 21:00 (T2 - CN)'}
                        </p>
                        <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
                            <span className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold ${statusFor(selected.quantity).cls}`}>
                                {statusFor(selected.quantity).label}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
