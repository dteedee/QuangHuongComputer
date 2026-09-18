/**
 * Picker drawer — one slot's candidates, pre-filtered server-side against the
 * rest of the current build (contract §2: incompatible rows are dropped,
 * `cannotVerify` rows are kept — "not a no").
 *
 * `search` / server-side `sort` are NOT contract params (only `slot`, `build`,
 * `page`, `pageSize` exist — measured against `docs/api-contracts/pc-builder.md`
 * §2, 2026-09-18). Per D12 ("never fabricate"), this does not pretend to
 * search the whole catalogue: the text box only quick-filters the page
 * already on screen (label says so), and "sort" only re-orders that same
 * fetched page — nothing is hidden across pages. Real params are filed as an
 * integration request (see report).
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownAZ, ArrowUpAZ, Search } from 'lucide-react';
import { pcBuilderApi, type PcCandidate, type PcSlotDef } from '../../api/pcbuilder';
import { Drawer, EmptyState, ErrorState, Input, Pagination, Skeleton } from '../ui';
import { PcCandidateRow } from './pc-candidate-row';

const PAGE_SIZE = 12;

export interface PcPickerDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    slot: PcSlotDef | null;
    buildProductIds: string[];
    selectedProductId?: string;
    onPick: (candidate: PcCandidate) => void;
}

export const PcPickerDrawer = ({
    open, onOpenChange, slot, buildProductIds, selectedProductId, onPick,
}: PcPickerDrawerProps) => {
    const [page, setPage] = useState(1);
    const [quickFilter, setQuickFilter] = useState('');
    const [priceDesc, setPriceDesc] = useState(false);

    const query = useQuery({
        queryKey: ['pcbuilder', 'candidates', slot?.id, buildProductIds, page],
        queryFn: () => pcBuilderApi.getCandidates({
            slot: slot!.id, build: buildProductIds, page, pageSize: PAGE_SIZE,
        }),
        enabled: open && !!slot,
    });

    const rows = useMemo<PcCandidate[]>(() => {
        const items = query.data?.items ?? [];
        const filtered = quickFilter.trim()
            ? items.filter((c) => c.name.toLowerCase().includes(quickFilter.trim().toLowerCase()))
            : items;
        return [...filtered].sort((a, b) => (priceDesc ? b.price - a.price : a.price - b.price));
    }, [query.data, quickFilter, priceDesc]);

    return (
        <Drawer
            open={open}
            onOpenChange={(v) => { onOpenChange(v); if (!v) { setPage(1); setQuickFilter(''); } }}
            title={slot ? `Chọn ${slot.name}` : 'Chọn linh kiện'}
            description="Chỉ hiển thị linh kiện tương thích hoặc chưa thể kiểm tra với cấu hình hiện tại."
            side="right"
        >
            <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                    <Input
                        icon={Search}
                        placeholder="Lọc trong trang này…"
                        value={quickFilter}
                        onChange={(e) => setQuickFilter(e.target.value)}
                        className="flex-1"
                    />
                    <button
                        type="button"
                        aria-label={priceDesc ? 'Giá cao đến thấp' : 'Giá thấp đến cao'}
                        onClick={() => setPriceDesc((v) => !v)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line text-fg-muted hover:border-line-strong"
                        title="Sắp xếp theo giá (trang hiện tại)"
                    >
                        {priceDesc ? <ArrowDownAZ size={18} /> : <ArrowUpAZ size={18} />}
                    </button>
                </div>

                {query.isPending && (
                    <ul className="space-y-2">
                        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[76px] w-full rounded-lg" />)}
                    </ul>
                )}

                {query.isError && (
                    <ErrorState error={query.error} onRetry={() => query.refetch()} inline />
                )}

                {query.isSuccess && rows.length === 0 && (
                    <EmptyState
                        title="Không có linh kiện phù hợp"
                        description={quickFilter
                            ? 'Không khớp bộ lọc trong trang này — thử xoá bộ lọc hoặc sang trang khác.'
                            : 'Không còn linh kiện nào tương thích với cấu hình hiện tại của bạn.'}
                        action={quickFilter ? { label: 'Xoá bộ lọc', onClick: () => setQuickFilter('') } : undefined}
                    />
                )}

                {query.isSuccess && rows.length > 0 && (
                    <ul className="space-y-2">
                        {rows.map((c) => (
                            <PcCandidateRow
                                key={c.productId}
                                candidate={c}
                                selected={c.productId === selectedProductId}
                                onPick={onPick}
                            />
                        ))}
                    </ul>
                )}

                {query.data && query.data.total > PAGE_SIZE && (
                    <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.total} onPageChange={setPage} />
                )}
            </div>
        </Drawer>
    );
};

export default PcPickerDrawer;
