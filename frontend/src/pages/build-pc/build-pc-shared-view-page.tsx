/**
 * `/xay-dung-cau-hinh/:code` — view a saved, shared build (contract §6).
 *
 * Shows the exact saved snapshot (items, total, verdict) AND lets the
 * customer continue editing it in the interactive builder: measured against
 * `PcBuilderBuildsEndpoint.cs:GetBuildByCodeAsync` (2026-09-19), each item
 * DOES carry a real, server-resolved `slotId` (`i.ComponentType`) — the
 * contract doc's prose undersold this. "Tiếp tục chỉnh sửa" seeds the
 * builder's session state from these slots (`pcBuildStateFromSavedItems`)
 * and navigates there; nothing is guessed client-side (rows with no
 * resolvable slot are dropped, never fabricated into one).
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Pencil, ShoppingCart } from 'lucide-react';
import { pcBuilderApi } from '../../api/pcbuilder';
import SEO from '../../components/SEO';
import { useCart } from '../../context/CartContext';
import { ROUTES } from '../../routes';
import { sessionBrowserStorage } from '../../lib/browser-storage';
import {
    Button, Card, CardBody, EmptyState, ErrorState, Img, PageHeader, Price, Skeleton, notify,
} from '../../components/ui';
import { PcVerdictBadge } from '../../components/pc-builder/pc-verdict-badge';
import { PC_BUILD_SESSION_KEY, pcBuildStateFromSavedItems } from './pc-build-state-types';

export const BuildPcSharedViewPage = () => {
    const { code = '' } = useParams<{ code: string }>();
    const { addToCart } = useCart();
    const navigate = useNavigate();
    const [addingAll, setAddingAll] = useState(false);

    const query = useQuery({
        queryKey: ['pcbuilder', 'build', code],
        queryFn: () => pcBuilderApi.getBuildByCode(code),
        enabled: !!code,
        retry: false,
    });

    const addAll = async () => {
        const build = query.data;
        if (!build) return;
        setAddingAll(true);
        let ok = 0;
        const failed: string[] = [];
        for (const item of build.items) {
            if (!item.product) { failed.push(item.productId); continue; }
            // Intentionally sequential (honest per-item feedback, same rule as the builder page).
            const success = await addToCart(
                { id: item.productId, name: item.product.name, price: item.unitPrice, stockQuantity: 9999 },
                item.quantity,
                { silent: true },
            );
            if (success) ok += 1; else failed.push(item.product.name);
        }
        setAddingAll(false);
        if (failed.length === 0) notify.success(`Đã thêm ${ok} linh kiện vào giỏ hàng`);
        else if (ok === 0) notify.error('Không thêm được linh kiện nào vào giỏ hàng.');
        else notify.error(`Đã thêm ${ok}/${build.items.length} linh kiện. Không thêm được: ${failed.join(', ')}.`);
    };

    const continueEditing = () => {
        if (!query.data) return;
        const state = pcBuildStateFromSavedItems(query.data.items);
        if (Object.keys(state).length === 0) {
            notify.error('Không thể tải lại linh kiện của cấu hình này để chỉnh sửa.');
            return;
        }
        sessionBrowserStorage.setJSON(PC_BUILD_SESSION_KEY, state);
        navigate(ROUTES.PC_BUILDER);
    };

    return (
        <div className="mx-auto max-w-shell px-4 py-6 sm:px-6 lg:py-10">
            <SEO title="Cấu hình PC đã chia sẻ" noindex />
            <PageHeader
                title={query.data?.name ?? 'Cấu hình PC đã chia sẻ'}
                breadcrumbs={[
                    { label: 'Trang chủ', to: ROUTES.HOME },
                    { label: 'Xây dựng cấu hình PC', to: ROUTES.PC_BUILDER },
                    { label: 'Cấu hình đã chia sẻ' },
                ]}
            />

            {query.isPending && (
                <div className="space-y-3">
                    {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
            )}

            {query.isError && (
                <ErrorState
                    title="Không tìm thấy cấu hình"
                    description="Liên kết không đúng hoặc cấu hình đã bị xoá."
                    onRetry={() => query.refetch()}
                />
            )}

            {query.isSuccess && query.data.items.length === 0 && (
                <EmptyState title="Cấu hình rỗng" description="Cấu hình này không còn linh kiện nào." />
            )}

            {query.isSuccess && query.data.items.length > 0 && (
                <div className="space-y-4">
                    <Card>
                        <CardBody className="flex items-center justify-between">
                            <span className="text-sm text-fg-muted">Mã chia sẻ: <b className="text-fg">{query.data.buildCode}</b></span>
                            <PcVerdictBadge verdict={query.data.isCompatible ? 'Compatible' : 'Incompatible'} />
                        </CardBody>
                    </Card>

                    <ul className="space-y-2">
                        {query.data.items.map((item) => (
                            <li key={item.productId} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                                <Img
                                    src={item.product?.imageUrl ?? null}
                                    alt={item.product?.name ?? 'Linh kiện'}
                                    ratio="1/1"
                                    fit="contain"
                                    blend
                                    className="h-14 w-14 shrink-0 rounded-md"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-fg">{item.product?.name ?? 'Sản phẩm không còn tồn tại'}</p>
                                    <p className="text-xs text-fg-subtle">SL: {item.quantity}</p>
                                </div>
                                <Price value={item.lineTotal} />
                            </li>
                        ))}
                    </ul>

                    <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-4">
                        <span className="text-sm text-fg-muted">Tổng tiền</span>
                        <Price value={query.data.totalPrice} className="text-lg font-semibold" />
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button variant="primary" icon={ShoppingCart} loading={addingAll} onClick={() => void addAll()} block>
                            Thêm tất cả vào giỏ
                        </Button>
                        <Button variant="outline" icon={Pencil} onClick={continueEditing} block>
                            Tiếp tục chỉnh sửa
                        </Button>
                        <Link to={ROUTES.PC_BUILDER} className="flex-1">
                            <Button variant="ghost" icon={ArrowRight} block>Bắt đầu cấu hình mới</Button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuildPcSharedViewPage;
