import { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Phone, Clock } from 'lucide-react';
import { storeApi, type Store } from '../api/store';
import StoresFilterBar from '../components/stores/stores-filter-bar';
import StoresResultsSection from '../components/stores/stores-results-section';
import StoreDetailModal from '../components/stores/store-detail-modal';
import SEO from '../components/SEO';
import { useCompanyInfo } from '../hooks/use-company-info';

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
    const { companyInfo } = useCompanyInfo();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        storeApi.list()
            .then(list => {
                if (cancelled) return;
                // Bug thật (phát hiện qua screenshot, xác minh bằng `curl :5000/api/stores`):
                // DTO công khai KHÔNG có field `isActive` (chỉ admin API mới có) — endpoint công
                // khai vốn chỉ trả cửa hàng active sẵn, filter theo `s.isActive` (luôn undefined)
                // loại bỏ hết -> trang rỗng ngay cả khi có cửa hàng thật. Bỏ filter thừa.
                const active = list;
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

    // D09: khi API chưa có cửa hàng nào (dữ liệu rỗng ở TEST/staging), không để trang trắng —
    // hiển thị trụ sở chính lấy từ config (useCompanyInfo, cùng nguồn footer/hoá đơn dùng).
    const showConfigFallback = !loading && !error && stores.length === 0;

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO
                title="Hệ thống cửa hàng"
                description="Địa chỉ, giờ mở cửa và số điện thoại các chi nhánh Quang Hưởng Computer."
            />
            {/* Hero */}
            <section className="bg-gradient-to-br from-[var(--accent-primary)] to-red-700 text-white">
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
                <StoresFilterBar
                    search={search}
                    onSearchChange={setSearch}
                    province={province}
                    onProvinceChange={setProvince}
                    provinces={provinces}
                />

                {showConfigFallback ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-xl">
                        <p className="text-xs uppercase tracking-wide text-accent font-bold mb-2">Trụ sở chính</p>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">{companyInfo.name}</h2>
                        <div className="space-y-2 text-sm text-gray-600">
                            <p className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" /> {companyInfo.address}</p>
                            <p className="flex items-center gap-2"><Phone className="w-4 h-4 shrink-0 text-gray-400" /> {companyInfo.hotline}</p>
                            <p className="flex items-center gap-2"><Clock className="w-4 h-4 shrink-0 text-gray-400" /> {companyInfo.workingHours}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-4">Danh sách chi nhánh chi tiết đang được cập nhật.</p>
                    </div>
                ) : (
                    <StoresResultsSection
                        loading={loading}
                        error={error}
                        visible={visible}
                        province={province}
                        onOpenStore={setSelected}
                    />
                )}
            </div>

            {selected && (
                <StoreDetailModal store={selected} onClose={() => setSelected(null)} />
            )}
        </div>
    );
}
