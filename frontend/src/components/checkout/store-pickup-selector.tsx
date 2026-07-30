import { useEffect, useState } from 'react';
import { MapPin, Store, Loader2 } from 'lucide-react';
import { inventoryApi, type Warehouse } from '../../api/inventory';

interface StorePickupSelectorProps {
    selectedId: string;
    onSelect: (id: string, name: string) => void;
}

/**
 * Chọn chi nhánh nhận hàng. Fallback dùng Warehouse với type Showroom/Main/Branch nếu chưa có /api/stores riêng.
 * Phí ship khi nhận tại cửa hàng luôn = 0 — CheckoutPage tự xử.
 */
export function StorePickupSelector({ selectedId, onSelect }: StorePickupSelectorProps) {
    const [stores, setStores] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        inventoryApi.warehouses
            .getList()
            .then(list => {
                if (cancelled) return;
                const pickupTypes: Warehouse['type'][] = ['Showroom', 'Main', 'Branch'];
                const usable = list.filter(w => w.isActive && pickupTypes.includes(w.type));
                setStores(usable);
                // Auto-chọn kho mặc định nếu chưa chọn gì
                if (!selectedId && usable.length > 0) {
                    const def = usable.find(w => w.isDefault) ?? usable[0];
                    onSelect(def.id, def.name);
                }
            })
            .catch(() => setError(true))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tải danh sách cửa hàng...
            </div>
        );
    }

    if (error || stores.length === 0) {
        return (
            <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-1 flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-[var(--accent-primary,#dc2626)]" />
                    Quang Hưởng Computer — Trụ sở chính
                </h4>
                <p className="text-sm text-gray-600">Số 179, Thôn 3/2, xã Vĩnh Bảo, Hải Phòng</p>
                <p className="text-xs text-gray-500 mt-2">Giờ mở: 07:00 – 17:15 · Miễn phí giao</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {stores.map(store => {
                const selected = selectedId === store.id;
                return (
                    <button
                        key={store.id}
                        type="button"
                        onClick={() => onSelect(store.id, store.name)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            selected
                                ? 'border-[var(--accent-primary,#dc2626)] bg-red-50/50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    selected ? 'bg-[var(--accent-primary,#dc2626)] text-white' : 'bg-gray-100 text-gray-500'
                                }`}
                            >
                                <Store className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-gray-900 text-sm">{store.name}</h4>
                                    {store.isDefault && (
                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
                                            Mặc định
                                        </span>
                                    )}
                                </div>
                                {store.address && (
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        {[store.address, store.ward, store.district, store.city].filter(Boolean).join(', ')}
                                    </p>
                                )}
                                <div className="mt-2 flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-500 font-medium">
                                        Giờ mở: 07:00 – 17:15
                                    </span>
                                    <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                                        Miễn phí ship
                                    </span>
                                </div>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

export default StorePickupSelector;
