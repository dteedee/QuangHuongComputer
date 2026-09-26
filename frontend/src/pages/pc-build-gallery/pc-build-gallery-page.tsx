/**
 * `/cau-hinh-mau` — "Cấu hình PC mẫu" do nhân viên tuyển chọn (SEO shell: PcBuildGallerySeoProvider).
 * Giá hiển thị là giá HIỆN HÀNH do server tính lại (`liveTotal`), không phải giá lúc lưu.
 */
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Cpu } from 'lucide-react';
import { PC_BUDGET_RANGES, pcBuildGalleryApi, type PcGalleryBuild } from '../../api/pcbuilder-gallery';
import SEO from '../../components/SEO';
import { PageHeader, QueryBoundary, Skeleton } from '../../components/ui';
import { ROUTES } from '../../routes';
import { PcBuildGalleryCard } from './pc-build-gallery-card';
import { PcBuildGalleryFilters } from './pc-build-gallery-filters';
import { usePcGalleryActions } from './use-pc-gallery-actions';

const GallerySkeleton = () => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-96 w-full rounded-2xl" />)}
    </div>
);

export const PcBuildGalleryPage = () => {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const tag = params.get('tag') ?? '';
    const budget = params.get('budget') ?? '';
    const range = PC_BUDGET_RANGES.find((r) => r.value === budget);
    const { buyAll, customize, buyingId } = usePcGalleryActions();

    const query = useQuery({
        queryKey: ['pcbuilder', 'gallery', tag, budget],
        queryFn: () => pcBuildGalleryApi.list({
            tag: tag || undefined, minBudget: range?.min, maxBudget: range?.max,
        }),
    });

    const updateFilter = (next: { tag?: string; budget?: string }) => {
        const merged = new URLSearchParams(params);
        for (const [key, value] of Object.entries(next)) {
            if (value) merged.set(key, value); else merged.delete(key);
        }
        setParams(merged, { replace: true });
    };

    const filtered = Boolean(tag || budget);

    return (
        <div className="mx-auto max-w-shell px-4 py-6 sm:px-6 lg:py-10">
            <SEO
                title="Cấu hình PC mẫu theo nhu cầu - Quang Hưởng Computer"
                description="Cấu hình PC mẫu cho Gaming, Văn phòng, Đồ họa, Streaming: giá cập nhật theo thời gian thực, kiểm tra tương thích sẵn, mua cả bộ hoặc tùy chỉnh."
                canonicalUrl={ROUTES.PC_BUILD_GALLERY}
            />
            <PageHeader
                title="Cấu hình PC mẫu"
                description="Các bộ máy do kỹ thuật viên Quang Hưởng chọn sẵn theo nhu cầu — mua cả bộ hoặc tùy chỉnh từng linh kiện."
                breadcrumbs={[{ label: 'Trang chủ', to: ROUTES.HOME }, { label: 'Cấu hình PC mẫu' }]}
            >
                <PcBuildGalleryFilters tag={tag} budget={budget} onChange={updateFilter} />
            </PageHeader>

            <QueryBoundary
                query={query}
                skeleton={<GallerySkeleton />}
                isEmpty={(data: PcGalleryBuild[]) => data.length === 0}
                empty={{
                    icon: Cpu,
                    title: filtered ? 'Không có cấu hình phù hợp bộ lọc' : 'Chưa có cấu hình mẫu',
                    description: 'Bạn có thể tự xây dựng cấu hình theo nhu cầu, hệ thống kiểm tra tương thích giúp bạn.',
                    action: { label: 'Tự xây dựng cấu hình', onClick: () => navigate(ROUTES.PC_BUILDER) },
                    ...(filtered ? { secondaryAction: { label: 'Xoá bộ lọc', onClick: () => updateFilter({ tag: '', budget: '' }) } } : {}),
                }}
            >
                {(builds) => (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {builds.map((build) => (
                            <PcBuildGalleryCard key={build.id} build={build} buying={buyingId === build.id}
                                onBuyAll={(b) => void buyAll(b)} onCustomize={customize} />
                        ))}
                    </div>
                )}
            </QueryBoundary>
        </div>
    );
};

export default PcBuildGalleryPage;
