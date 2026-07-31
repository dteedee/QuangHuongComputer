import { useEffect, useMemo, useState } from 'react';
import { MapPin, Store, Loader2, Clock, Phone } from 'lucide-react';
import {
    storeApi,
    getTodayHours,
    type Store as StoreEntity,
} from '../../api/store';

interface StorePickupSelectorProps {
    selectedId: string;
    onSelect: (id: string, name: string) => void;
}

/**
 * Chọn chi nhánh để nhận hàng tại cửa hàng.
 *
 * Dùng `storeApi.list()` (endpoint công khai) và chỉ lấy chi nhánh:
 *  - `isActive = true`
 *  - `isPickupPoint = true`
 *
 * Khi bấm 1 chi nhánh → hiển thị thêm chi tiết địa chỉ + giờ mở cửa hôm nay.
 * Nếu không có chi nhánh nào được đánh dấu `isPickupPoint` → hướng dẫn khách
 * chuyển sang phương thức giao hàng.
 */
export function StorePickupSelector({ selectedId, onSelect }: StorePickupSelectorProps) {
    const [stores, setStores] = useState<StoreEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        storeApi.list()
            .then(list => {
                if (cancelled) return;
                const usable = list
                    .filter(s => s.isActive && s.isPickupPoint)
                    .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name, 'vi'));
                setStores(usable);
                // Auto-chọn chi nhánh đầu tiên nếu người dùng chưa chọn
                if (!selectedId && usable.length > 0) {
                    onSelect(usable[0].id, usable[0].name);
                }
            })
            .catch(() => setError(true))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tải danh sách cửa hàng...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-1 text-sm">Không tải được danh sách cửa hàng</h4>
                <p className="text-sm text-gray-600">
                    Vui lòng thử lại sau hoặc chọn phương thức giao hàng.
                </p>
            </div>
        );
    }

    if (stores.length === 0) {
        return (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
                <h4 className="font-bold text-gray-900 mb-1 flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    Hiện chưa có điểm nhận hàng
                </h4>
                <p className="text-sm text-gray-600">
                    Vui lòng chọn phương thức <span className="font-semibold">giao hàng tận nơi</span> để hoàn tất đặt hàng.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {stores.map(store => (
                <StoreOption
                    key={store.id}
                    store={store}
                    selected={selectedId === store.id}
                    onSelect={() => onSelect(store.id, store.name)}
                />
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Option
// ---------------------------------------------------------------------------

function StoreOption({
    store, selected, onSelect,
}: { store: StoreEntity; selected: boolean; onSelect: () => void }) {
    const fullAddress = useMemo(
        () => [store.address, store.ward, store.district, store.province].filter(Boolean).join(', '),
        [store],
    );
    const todayHours = getTodayHours(store.openingHoursJson);
    const isOpenToday = todayHours && todayHours !== 'closed';

    return (
        <label
            className={`block w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                selected
                    ? 'border-[var(--accent-primary,#dc2626)] bg-red-50/50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
        >
            <div className="flex items-start gap-3">
                <input
                    type="radio"
                    className="sr-only"
                    name="store-pickup"
                    checked={selected}
                    onChange={onSelect}
                />
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
                        {selected && (
                            <span className="text-[10px] bg-[var(--accent-primary,#dc2626)] text-white px-1.5 py-0.5 rounded-full font-semibold">
                                Đã chọn
                            </span>
                        )}
                    </div>
                    {fullAddress && (
                        <p className="text-xs text-gray-600 mt-0.5 flex items-start gap-1">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-400" />
                            <span>{fullAddress}</span>
                        </p>
                    )}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {isOpenToday ? (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600 font-medium">
                                <Clock className="w-3 h-3" />
                                Hôm nay: {todayHours}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-500 font-medium italic">
                                <Clock className="w-3 h-3" />
                                Hôm nay: nghỉ
                            </span>
                        )}
                        {store.phone && (
                            <a
                                href={`tel:${store.phone}`}
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[11px] bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600 font-medium hover:text-[var(--accent-primary,#dc2626)]"
                            >
                                <Phone className="w-3 h-3" />
                                {store.phone}
                            </a>
                        )}
                        <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                            Miễn phí ship
                        </span>
                    </div>
                </div>
            </div>
        </label>
    );
}

export default StorePickupSelector;
