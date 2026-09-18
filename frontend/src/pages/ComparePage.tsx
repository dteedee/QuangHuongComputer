/**
 * Product comparison.
 *
 * Rows come from the SAME grouped spec payload the PDP renders
 * (`?include=specs` → `specGroups[i].values[]`, keyed by the attribute `key`),
 * not from the category schema + a separate value list — that pairing only
 * worked when `ProductSpecificationValues` had rows, which it does not, so the
 * table was empty for every real product.
 *
 * An empty comparison now shows an empty state instead of silently redirecting.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Minus, Plus, Scale, ShoppingCart, Star, X } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { catalogApi } from '../api/catalog';
import type { Product } from '../api/catalog';
import { catalogPublicProductApi, type PublicProductDetail } from '../api/catalog/public-product';
import { useCart } from '../context/CartContext';
import { useComparison } from '../context/ComparisonContext';
import { buildPath, ROUTES } from '../routes/route-paths';
import { formatCurrency } from '../utils/format';
import { Button, Dialog, EmptyState, Img, Skeleton } from '../components/ui';

/** One comparable row: an attribute key, its label, and the value per product. */
interface SpecRow {
    key: string;
    name: string;
    unit?: string | null;
    group: string;
}

export function ComparePage() {
    const { items, removeFromComparison, clearComparison, addToComparison } = useComparison();
    const { addToCart } = useCart();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState<PublicProductDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerCandidates, setPickerCandidates] = useState<Product[]>([]);
    const [pickerLoading, setPickerLoading] = useState(false);

    // `/compare?add=<productId>` — the PDP's "so sánh" button.
    useEffect(() => {
        const addId = searchParams.get('add');
        if (!addId) return;
        void (async () => {
            try {
                const p = await catalogApi.getProduct(addId);
                addToComparison(p);
            } catch { /* a bad id must not break the page */ }
            const next = new URLSearchParams(searchParams);
            next.delete('add');
            setSearchParams(next, { replace: true });
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let cancelled = false;
        if (items.length === 0) { setProducts([]); setLoading(false); return; }
        setLoading(true);
        void Promise.all(
            items.map((item) =>
                catalogPublicProductApi
                    .getProductDetail(item.id, ['media', 'specs'])
                    .catch(() => null)
            )
        ).then((loaded) => {
            if (cancelled) return;
            setProducts(loaded.filter((p): p is PublicProductDetail => p !== null));
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [items]);

    /** Union of every attribute key across the compared products, in group order. */
    const specRows = useMemo<SpecRow[]>(() => {
        const rows = new Map<string, SpecRow>();
        products.forEach((p) => {
            (p.specGroups ?? [])
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .forEach((g) => {
                    (g.values ?? []).forEach((v) => {
                        if (!v.value || !String(v.value).trim()) return;
                        const id = `${g.groupName}::${v.key}`;
                        if (!rows.has(id)) {
                            rows.set(id, { key: v.key, name: v.name, unit: v.unit, group: g.groupName });
                        }
                    });
                });
        });
        return Array.from(rows.values());
    }, [products]);

    const groupedRows = useMemo(() => {
        const byGroup = new Map<string, SpecRow[]>();
        specRows.forEach((r) => {
            const list = byGroup.get(r.group) ?? [];
            list.push(r);
            byGroup.set(r.group, list);
        });
        return Array.from(byGroup.entries());
    }, [specRows]);

    const valueOf = (product: PublicProductDetail, row: SpecRow): string | null => {
        for (const g of product.specGroups ?? []) {
            if (g.groupName !== row.group) continue;
            const hit = (g.values ?? []).find((v) => v.key === row.key);
            if (hit && String(hit.value).trim()) {
                return `${hit.value}${hit.unit ? ` ${hit.unit}` : ''}`;
            }
        }
        return null;
    };

    /** Highlight a row when the products genuinely differ on it. */
    const isRowDiverse = (row: SpecRow) =>
        new Set(products.map((p) => valueOf(p, row) ?? '')).size > 1;

    const openPicker = async () => {
        if (products.length === 0) return;
        setPickerOpen(true);
        setPickerLoading(true);
        try {
            const catId = products[0].categoryId;
            const res = await catalogApi.getProducts({ categoryId: catId, pageSize: 20 });
            const existingIds = new Set(products.map((p) => p.id));
            setPickerCandidates((res.products || []).filter((p) => !existingIds.has(p.id)));
        } catch {
            setPickerCandidates([]);
        } finally {
            setPickerLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-bg py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
                    <Skeleton className="h-8 w-1/4" />
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-96 w-full rounded-xl" />)}
                    </div>
                </div>
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-20">
                <EmptyState
                    icon={Scale}
                    title="Chưa có sản phẩm nào để so sánh"
                    description="Bấm “So sánh” trên một sản phẩm bất kỳ, rồi quay lại đây để xem bảng thông số cạnh nhau."
                    action={{ label: 'Xem danh sách sản phẩm', onClick: () => navigate(ROUTES.PRODUCTS) }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <Link
                            to={ROUTES.PRODUCTS}
                            className="mb-2 inline-flex items-center gap-2 text-sm text-fg-muted hover:text-brand-text"
                        >
                            <ArrowLeft size={16} aria-hidden="true" />
                            Tiếp tục mua sắm
                        </Link>
                        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-fg">
                            <Scale className="text-brand" size={24} aria-hidden="true" />
                            So sánh sản phẩm <span className="num">({products.length})</span>
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        {products.length < 4 && (
                            <Button variant="outline" size="sm" onClick={() => void openPicker()}>
                                <Plus size={16} aria-hidden="true" /> Thêm sản phẩm
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { clearComparison(); navigate(ROUTES.PRODUCTS); }}
                        >
                            Xoá tất cả
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-line bg-surface">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-line">
                                    <th className="w-44 bg-sunken p-4 text-left text-sm font-semibold text-fg-muted">
                                        Sản phẩm
                                    </th>
                                    {products.map((product) => (
                                        <th key={product.id} className="min-w-[220px] p-4 text-center">
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => removeFromComparison(product.id)}
                                                    className="absolute -right-2 -top-2 rounded-full bg-sunken p-1.5 text-fg-subtle transition-colors hover:bg-brand-subtle hover:text-brand-text"
                                                    aria-label={`Bỏ ${product.name} khỏi so sánh`}
                                                >
                                                    <X className="h-3 w-3" aria-hidden="true" />
                                                </button>
                                                <Link to={buildPath(ROUTES.PRODUCT_DETAIL, product.slug || product.id)}>
                                                    <Img
                                                        src={product.medias?.[0]?.thumbnailUrl ?? product.medias?.[0]?.url ?? product.thumbnailUrl ?? product.imageUrl}
                                                        alt={product.name}
                                                        ratio="1/1"
                                                        fit="contain"
                                                        blend
                                                        wrapperClassName="mx-auto mb-3 w-32 overflow-hidden rounded-xl"
                                                    />
                                                    <h2 className="line-clamp-2 text-sm font-semibold text-fg hover:text-brand-text">
                                                        {product.name}
                                                    </h2>
                                                </Link>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                <tr className="border-b border-line bg-brand-subtle/40">
                                    <td className="bg-sunken p-4 text-sm font-semibold text-fg-muted">Giá</td>
                                    {products.map((product) => (
                                        <td key={product.id} className="p-4 text-center">
                                            <div className="num price text-xl font-bold text-brand-text">
                                                {formatCurrency(product.priceFrom ?? product.price)}
                                            </div>
                                            {product.oldPrice && product.oldPrice > product.price && (
                                                <div className="num text-sm text-fg-subtle line-through">
                                                    {formatCurrency(product.oldPrice)}
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                </tr>

                                <tr className="border-b border-line">
                                    <td className="bg-sunken p-4 text-sm font-semibold text-fg-muted">Đánh giá</td>
                                    {products.map((product) => (
                                        <td key={product.id} className="p-4 text-center">
                                            {product.reviewCount > 0 ? (
                                                <span className="inline-flex items-center gap-1 text-sm text-fg">
                                                    <Star className="h-4 w-4 fill-current text-rating" aria-hidden="true" />
                                                    <span className="num font-semibold">
                                                        {product.averageRating.toFixed(1)}
                                                    </span>
                                                    <span className="num text-fg-subtle">({product.reviewCount})</span>
                                                </span>
                                            ) : (
                                                <span className="text-sm text-fg-subtle">Chưa có đánh giá</span>
                                            )}
                                        </td>
                                    ))}
                                </tr>

                                <tr className="border-b border-line">
                                    <td className="bg-sunken p-4 text-sm font-semibold text-fg-muted">Tình trạng</td>
                                    {products.map((product) => (
                                        <td key={product.id} className="p-4 text-center">
                                            <span className={`rounded-sm px-2.5 py-0.5 text-xs font-semibold ${
                                                product.stockQuantity > 0
                                                    ? 'bg-success-subtle text-success'
                                                    : 'bg-danger-subtle text-danger'
                                            }`}>
                                                {product.stockQuantity > 0 ? 'Còn hàng' : 'Hết hàng'}
                                            </span>
                                        </td>
                                    ))}
                                </tr>

                                <tr className="border-b border-line">
                                    <td className="bg-sunken p-4 text-sm font-semibold text-fg-muted">Bảo hành</td>
                                    {products.map((product) => (
                                        <td key={product.id} className="p-4 text-center text-sm text-fg-muted">
                                            {product.warrantyMonths
                                                ? `${product.warrantyMonths} tháng`
                                                : product.warrantyInfo || '—'}
                                        </td>
                                    ))}
                                </tr>

                                {groupedRows.map(([groupName, rows]) => (
                                    <React.Fragment key={groupName}>
                                        <tr className="border-b border-line bg-sunken">
                                            <td
                                                colSpan={products.length + 1}
                                                className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-fg-muted"
                                            >
                                                {groupName}
                                            </td>
                                        </tr>
                                        {rows.map((row) => {
                                            const diverse = isRowDiverse(row);
                                            return (
                                                <tr key={`${groupName}-${row.key}`} className="border-b border-line">
                                                    <td className="bg-sunken p-4 text-sm font-medium text-fg-muted">
                                                        {row.name}
                                                    </td>
                                                    {products.map((product) => {
                                                        const display = valueOf(product, row);
                                                        return (
                                                            <td
                                                                key={product.id}
                                                                className={`p-4 text-center text-sm text-fg ${
                                                                    diverse ? 'bg-warning-subtle' : ''
                                                                }`}
                                                            >
                                                                {display || (
                                                                    <Minus className="mx-auto h-3 w-3 text-fg-subtle" aria-hidden="true" />
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}

                                <tr className="bg-sunken">
                                    <td className="bg-sunken p-4" />
                                    {products.map((product) => (
                                        <td key={product.id} className="p-4 text-center">
                                            <Button
                                                block
                                                size="sm"
                                                disabled={product.stockQuantity === 0}
                                                onClick={() => void addToCart(product, 1)}
                                            >
                                                <ShoppingCart size={16} aria-hidden="true" />
                                                Thêm vào giỏ
                                            </Button>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {specRows.length === 0 && (
                    <p className="mt-4 rounded-xl border border-dashed border-line bg-surface p-6 text-center text-sm text-fg-muted">
                        Các sản phẩm này chưa có thông số kỹ thuật có cấu trúc để đối chiếu.
                    </p>
                )}

                {products.length >= 2 && (
                    <div className="mt-6 rounded-xl border border-line bg-surface p-6">
                        <h2 className="mb-4 text-lg font-bold text-fg">Tóm tắt so sánh</h2>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="rounded-xl border border-success/20 bg-success-subtle p-4">
                                <p className="mb-2 text-xs font-semibold uppercase text-success">Giá tốt nhất</p>
                                {(() => {
                                    const cheapest = products.reduce((min, p) => (p.price < min.price ? p : min));
                                    return (
                                        <div className="flex items-center gap-2">
                                            <Check className="flex-shrink-0 text-success" size={16} aria-hidden="true" />
                                            <span className="truncate text-sm font-medium text-fg">{cheapest.name}</span>
                                            <span className="num ml-auto whitespace-nowrap text-sm font-bold text-success">
                                                {formatCurrency(cheapest.price)}
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                            {products.some((p) => p.reviewCount > 0) && (
                                <div className="rounded-xl border border-warning/20 bg-warning-subtle p-4">
                                    <p className="mb-2 text-xs font-semibold uppercase text-warning">Đánh giá cao nhất</p>
                                    {(() => {
                                        const best = products.reduce((max, p) =>
                                            (p.averageRating > max.averageRating ? p : max));
                                        return (
                                            <div className="flex items-center gap-2">
                                                <Star className="flex-shrink-0 fill-current text-rating" size={16} aria-hidden="true" />
                                                <span className="truncate text-sm font-medium text-fg">{best.name}</span>
                                                <span className="num ml-auto text-sm font-bold text-warning">
                                                    {best.averageRating.toFixed(1)}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <Dialog
                    open={pickerOpen}
                    onOpenChange={setPickerOpen}
                    title="Chọn sản phẩm để so sánh"
                    size="lg"
                >
                    <div className="space-y-2">
                        {pickerLoading ? (
                            <div className="space-y-2">
                                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                            </div>
                        ) : pickerCandidates.length === 0 ? (
                            <p className="py-6 text-center text-sm text-fg-muted">
                                Không còn sản phẩm nào khác trong danh mục này.
                            </p>
                        ) : (
                            pickerCandidates.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => { addToComparison(p); setPickerOpen(false); }}
                                    className="flex w-full items-center gap-3 rounded-lg border border-line p-2 text-left transition-colors hover:border-brand hover:bg-brand-subtle/40"
                                >
                                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                                        <Img
                                            src={p.thumbnailUrl ?? p.imageUrl}
                                            alt={p.name}
                                            ratio="1/1"
                                            fit="contain"
                                            blend
                                            wrapperClassName="h-full w-full"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-fg">{p.name}</p>
                                        <p className="num text-xs font-bold text-brand-text">{formatCurrency(p.price)}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </Dialog>
            </div>
        </div>
    );
}

export default ComparePage;
