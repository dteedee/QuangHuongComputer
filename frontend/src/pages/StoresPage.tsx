import { useEffect, useMemo, useState } from 'react';
import {
    MapPin,
    Phone,
    Clock,
    Search,
    X,
    Store as StoreIcon,
    ExternalLink,
    Mail,
    Building2,
} from 'lucide-react';
import {
    storeApi,
    parseOpeningHours,
    getTodayHours,
    DAY_KEYS,
    DAY_LABELS,
    type Store,
} from '../api/store';
import StoreLocatorMap from '../components/store-locator-map';

/**
 * Trang công khai "Hệ thống cửa hàng Quang Hưởng Computer".
 *
 * - Chỉ hiển thị chi nhánh `isActive` (dữ liệu công khai).
 * - Filter: search theo tên/địa chỉ + lọc theo tỉnh/thành.
 * - Card mỗi chi nhánh: giờ mở cửa hôm nay, SĐT, mở Google Maps.
 * - Bấm card → modal chi tiết + bản đồ nhúng.
 *
 * KHÔNG lộ số tồn kho chi tiết — trang này chỉ hiển thị thông tin cửa hàng.
 */
export default function StoresPage() {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [province, setProvince] = useState<string>('');
    const [selected, setSelected] = useState<Store | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        storeApi.list()
            .then(list => {
                if (cancelled) return;
                const active = list.filter(s => s.isActive);
                active.sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name, 'vi'));
                setStores(active);
            })
            .catch(() => {
                if (!cancelled) setError('Không tải được danh sách cửa hàng. Vui lòng thử lại sau.');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const provinces = useMemo(() => {
        const set = new Set<string>();
        for (const s of stores) if (s.province) set.add(s.province);
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
    }, [stores]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return stores.filter(s => {
            if (province && s.province !== province) return false;
            if (!q) return true;
            const hay = [s.name, s.address, s.ward, s.district, s.province]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return hay.includes(q);
        });
    }, [stores, search, province]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <section className="bg-gradient-to-br from-[var(--accent-primary,#dc2626)] to-red-700 text-white">
                <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
                    <div className="flex items-center gap-3 text-white/80 text-sm mb-3">
                        <Building2 className="w-4 h-4" />
                        <span>Điểm bán chính hãng · Bảo hành tận nơi</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                        Hệ thống cửa hàng<br className="md:hidden" /> Quang Hưởng Computer
                    </h1>
                    <p className="mt-3 text-white/90 max-w-2xl">
                        Ghé thăm chi nhánh gần bạn để trải nghiệm sản phẩm, nhận tư vấn kỹ thuật
                        và mua hàng tận tay. Toàn bộ cửa hàng đều nhận bảo hành và sửa chữa.
                    </p>
                </div>
            </section>

            <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                {/* Filter bar */}
                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Tìm theo tên hoặc địa chỉ..."
                            className="w-full pl-11 pr-10 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[var(--accent-primary,#dc2626)]/20 outline-none placeholder:text-gray-400"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                                aria-label="Xoá tìm kiếm"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <select
                        value={province}
                        onChange={e => setProvince(e.target.value)}
                        className="min-w-[180px] px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[var(--accent-primary,#dc2626)]/20 outline-none"
                    >
                        <option value="">Tất cả tỉnh/thành</option>
                        {provinces.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>

                {/* Results */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[0, 1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-56 rounded-2xl bg-white border border-gray-100 animate-pulse" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
                        <p className="text-red-700 font-medium">{error}</p>
                    </div>
                ) : visible.length === 0 ? (
                    <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
                        <StoreIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <h3 className="font-bold text-gray-900 mb-1">Không tìm thấy cửa hàng phù hợp</h3>
                        <p className="text-sm text-gray-500">
                            Thử tìm với từ khoá khác hoặc chọn tỉnh/thành khác.
                        </p>
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-gray-500">
                            Tìm thấy <span className="font-semibold text-gray-800">{visible.length}</span> chi nhánh
                            {province ? ` tại ${province}` : ''}.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {visible.map(store => (
                                <StoreCard
                                    key={store.id}
                                    store={store}
                                    onOpen={() => setSelected(store)}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {selected && (
                <StoreDetailModal store={selected} onClose={() => setSelected(null)} />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function StoreCard({ store, onOpen }: { store: Store; onOpen: () => void }) {
    const fullAddress = [store.address, store.ward, store.district, store.province]
        .filter(Boolean)
        .join(', ');
    const todayHours = getTodayHours(store.openingHoursJson);
    const isOpenToday = todayHours && todayHours !== 'closed';

    const mapsUrl = buildMapsUrl(store);

    return (
        <button
            type="button"
            onClick={onOpen}
            className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all p-5 flex flex-col gap-3"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-[var(--accent-primary,#dc2626)] flex items-center justify-center">
                        <StoreIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 leading-tight line-clamp-1">{store.name}</h3>
                        {store.isPickupPoint && (
                            <span className="inline-block mt-0.5 text-[11px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full font-semibold">
                                Nhận tại cửa hàng
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="text-sm text-gray-600 space-y-1.5">
                <p className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
                    <span className="line-clamp-2">{fullAddress || 'Đang cập nhật địa chỉ'}</span>
                </p>
                {store.phone && (
                    <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4 flex-shrink-0 text-gray-400" />
                        <a
                            href={`tel:${store.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="hover:text-[var(--accent-primary,#dc2626)]"
                        >
                            {store.phone}
                        </a>
                    </p>
                )}
                <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    {isOpenToday ? (
                        <span>
                            <span className="text-emerald-600 font-semibold">Hôm nay:</span> {todayHours}
                        </span>
                    ) : (
                        <span className="text-gray-500 italic">Hôm nay: nghỉ</span>
                    )}
                </p>
            </div>

            {mapsUrl && (
                <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-primary,#dc2626)] hover:underline"
                >
                    <ExternalLink className="w-4 h-4" />
                    Chỉ đường Google Maps
                </a>
            )}
        </button>
    );
}

// ---------------------------------------------------------------------------
// Detail modal
// ---------------------------------------------------------------------------

function StoreDetailModal({ store, onClose }: { store: Store; onClose: () => void }) {
    const fullAddress = [store.address, store.ward, store.district, store.province]
        .filter(Boolean)
        .join(', ');
    const hours = parseOpeningHours(store.openingHoursJson);
    const todayHours = getTodayHours(store.openingHoursJson);
    const jsDay = new Date().getDay(); // 0 = CN
    const dayIndexMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayKey = dayIndexMap[jsDay];

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-red-50 text-[var(--accent-primary,#dc2626)] flex items-center justify-center flex-shrink-0">
                            <StoreIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-gray-900 truncate">{store.name}</h2>
                            {store.isPickupPoint && (
                                <span className="inline-block mt-0.5 text-[11px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full font-semibold">
                                    Nhận tại cửa hàng
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full flex-shrink-0"
                        aria-label="Đóng"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Info block */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoRow icon={<MapPin className="w-4 h-4" />} label="Địa chỉ">
                            {fullAddress || 'Đang cập nhật'}
                        </InfoRow>
                        <InfoRow icon={<Phone className="w-4 h-4" />} label="Điện thoại">
                            {store.phone ? (
                                <a href={`tel:${store.phone}`} className="hover:text-[var(--accent-primary,#dc2626)]">
                                    {store.phone}
                                </a>
                            ) : '—'}
                        </InfoRow>
                        {store.email && (
                            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email">
                                <a href={`mailto:${store.email}`} className="hover:text-[var(--accent-primary,#dc2626)]">
                                    {store.email}
                                </a>
                            </InfoRow>
                        )}
                        <InfoRow icon={<Clock className="w-4 h-4" />} label="Giờ mở cửa hôm nay">
                            {todayHours && todayHours !== 'closed' ? (
                                <span className="text-emerald-700 font-semibold">{todayHours}</span>
                            ) : (
                                <span className="text-gray-500 italic">Nghỉ</span>
                            )}
                        </InfoRow>
                    </div>

                    {/* Opening hours table */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            Giờ mở cửa cả tuần
                        </h3>
                        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-gray-50/60">
                            {DAY_KEYS.map(day => {
                                const value = hours[day];
                                const isToday = day === todayKey;
                                return (
                                    <li
                                        key={day}
                                        className={`flex items-center justify-between px-4 py-2 text-sm ${
                                            isToday ? 'bg-red-50/70 font-semibold' : ''
                                        }`}
                                    >
                                        <span className={isToday ? 'text-[var(--accent-primary,#dc2626)]' : 'text-gray-700'}>
                                            {DAY_LABELS[day]}{isToday ? ' (hôm nay)' : ''}
                                        </span>
                                        <span className={value === 'closed' || !value ? 'text-gray-400 italic' : 'text-gray-800'}>
                                            {!value ? '—' : value === 'closed' ? 'Nghỉ' : value}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Map */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            Vị trí trên bản đồ
                        </h3>
                        <StoreLocatorMap store={store} heightClass="h-72" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold flex items-center gap-1.5 mb-1">
                <span className="text-gray-400">{icon}</span>
                {label}
            </p>
            <div className="text-sm text-gray-800">{children}</div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMapsUrl(store: Pick<Store, 'address' | 'ward' | 'district' | 'province' | 'latitude' | 'longitude'>): string | null {
    if (store.latitude != null && store.longitude != null) {
        return `https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`;
    }
    const address = [store.address, store.ward, store.district, store.province].filter(Boolean).join(', ');
    if (!address) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
