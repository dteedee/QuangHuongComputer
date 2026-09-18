/**
 * D09 — with ONE active store the PDP shows a single line
 *   "Có sẵn tại: <địa chỉ> · Xem bản đồ"
 * and disappears entirely when the product is out of stock. The per-branch list
 * (and its modal) only comes back once two or more stores are active; quantities
 * are never exposed — only in-stock / low-stock / out-of-stock.
 */
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, MapPin, XCircle } from 'lucide-react';

import { storeApi, type StockAvailability, type Store, type StockByStore } from '../../api/store';
import { Skeleton } from '../ui';

interface ProductStockByBranchProps {
    productId: string;
    /** The buy box already knows whether the product is sellable at all. */
    inStock?: boolean;
}

function availabilityMeta(a: StockAvailability) {
    switch (a) {
        case 'InStock':
            return { label: 'Còn hàng', cls: 'text-success bg-success-subtle border-success/20', Icon: CheckCircle2 };
        case 'LowStock':
            return { label: 'Sắp hết', cls: 'text-warning bg-warning-subtle border-warning/20', Icon: AlertTriangle };
        default:
            return { label: 'Hết hàng', cls: 'text-danger bg-danger-subtle border-danger/20', Icon: XCircle };
    }
}

function fullAddress(s: Pick<Store, 'address' | 'ward' | 'district' | 'province'>) {
    return [s.address, s.ward, s.district, s.province].filter(Boolean).join(', ');
}

function mapHref(s: Store) {
    if (s.latitude != null && s.longitude != null) {
        return `https://www.google.com/maps/search/?api=1&query=${s.latitude},${s.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(s))}`;
}

export default function ProductStockByBranch({ productId, inStock = true }: ProductStockByBranchProps) {
    const storesQuery = useQuery<Store[]>({
        queryKey: ['stores', 'public', 'list'],
        queryFn: storeApi.list,
        staleTime: 10 * 60 * 1000,
    });

    const stores = storesQuery.data ?? [];
    const multiStore = stores.length >= 2;

    const stockQuery = useQuery<StockByStore[]>({
        queryKey: ['stores', 'stock', productId],
        queryFn: () => storeApi.getStockByProduct(productId),
        enabled: multiStore && Boolean(productId),
        staleTime: 60 * 1000,
    });

    if (storesQuery.isPending) {
        return <Skeleton className="h-11 w-full rounded-lg" />;
    }

    if (stores.length === 0) return null;

    // ---- Single store (the real topology today) -----------------------------
    if (!multiStore) {
        if (!inStock) return null;
        const store = stores[0];
        const address = fullAddress(store);
        return (
            <p className="flex flex-wrap items-start gap-1.5 rounded-lg border border-line bg-sunken px-3 py-2.5 text-sm text-fg">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-fg-subtle" aria-hidden="true" />
                <span>
                    <span className="font-semibold">Có sẵn tại:</span>{' '}
                    {address || store.name}
                    {' · '}
                    <a
                        href={mapHref(store)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-semibold text-brand-text hover:underline"
                    >
                        Xem bản đồ
                    </a>
                </span>
            </p>
        );
    }

    // ---- Two or more stores -------------------------------------------------
    const items = stockQuery.data ?? [];
    if (stockQuery.isPending) return <Skeleton className="h-20 w-full rounded-lg" />;
    if (items.length === 0) return null;

    return (
        <div className="space-y-1.5">
            <p className="text-sm font-semibold text-fg">Tình trạng tại chi nhánh</p>
            <ul className="space-y-1.5">
                {items.map((it) => {
                    const meta = availabilityMeta(it.availability);
                    const store = stores.find((s) => s.id === it.storeId);
                    const Icon = meta.Icon;
                    return (
                        <li
                            key={it.storeId}
                            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2"
                        >
                            <span className="flex min-w-0 items-center gap-2 text-sm text-fg">
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-fg-subtle" aria-hidden="true" />
                                <span className="truncate">
                                    {store ? fullAddress(store) || store.name : it.storeName}
                                </span>
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-semibold ${meta.cls}`}>
                                <Icon className="h-3 w-3" aria-hidden="true" />
                                {meta.label}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
