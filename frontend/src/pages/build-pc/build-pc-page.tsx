/**
 * `/xay-dung-cau-hinh` — the PC builder (phase-57-w3-pc-builder-ui). The
 * header and two banners promote this feature; W0-12 hid the links because
 * the page did not exist yet. It exists now — CTA re-enable is a separate
 * integration request (W3-1 owns those files).
 */
import { useState } from 'react';
import SEO from '../../components/SEO';
import { PageHeader, EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { ROUTES } from '../../routes';
import type { PcCandidate, PcSlotDef } from '../../api/pcbuilder';
import { PC_SLOT_ORDER } from '../../api/pcbuilder';
import { PcSlotRow } from '../../components/pc-builder/pc-slot-row';
import { PcPickerDrawer } from '../../components/pc-builder/pc-picker-drawer';
import { PcCompatibilityPanel } from '../../components/pc-builder/pc-compatibility-panel';
import { PcSummaryBar } from '../../components/pc-builder/pc-summary-bar';
import { PcBudgetSuggestPanel } from '../../components/pc-builder/pc-budget-suggest-panel';
import { PcSaveShareDialog } from '../../components/pc-builder/pc-save-share-dialog';
import { usePcBuilderState } from './use-pc-builder-state';

export const BuildPcPage = () => {
    const {
        state, slotsQuery, checkQuery, pickedCount, buildProductIds, checkItems,
        pickItem, removeItem, setQuantity, applySuggestion, addAllToCart, addAllRunning,
    } = usePcBuilderState();
    const [pickerSlot, setPickerSlot] = useState<PcSlotDef | null>(null);
    const [saveOpen, setSaveOpen] = useState(false);

    const handlePick = (slot: PcSlotDef) => (candidate: PcCandidate) => {
        pickItem(
            slot.id,
            {
                productId: candidate.productId, quantity: 1, name: candidate.name, sku: candidate.sku,
                slug: candidate.slug, price: candidate.price, imageUrl: candidate.imageUrl, inStock: candidate.inStock,
            },
            slot.allowMultiple, slot.maxQuantity,
        );
        if (!slot.allowMultiple) setPickerSlot(null);
    };

    const handlePrint = () => window.print();

    const orderedSlots = (slotsQuery.data?.slots ?? [])
        .slice()
        .sort((a, b) => PC_SLOT_ORDER.indexOf(a.id) - PC_SLOT_ORDER.indexOf(b.id));

    return (
        <div className="mx-auto max-w-shell px-4 pb-28 pt-6 sm:px-6 lg:pb-10 lg:pt-10">
            <SEO
                title="Xây dựng cấu hình PC"
                description="Tự chọn CPU, mainboard, RAM, VGA và các linh kiện khác — hệ thống kiểm tra tương thích theo thời gian thực, ước tính công suất và tổng tiền."
            />
            <PageHeader
                title="Xây dựng cấu hình PC"
                description="Chọn từng linh kiện — hệ thống tự kiểm tra tương thích và tính tổng tiền."
                breadcrumbs={[{ label: 'Trang chủ', to: ROUTES.HOME }, { label: 'Xây dựng cấu hình PC' }]}
            />

            <div className="mb-6">
                <PcBudgetSuggestPanel onApply={applySuggestion} />
            </div>

            {slotsQuery.isPending && (
                <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                </div>
            )}

            {slotsQuery.isError && (
                <ErrorState error={slotsQuery.error} onRetry={() => slotsQuery.refetch()} />
            )}

            {slotsQuery.isSuccess && orderedSlots.length === 0 && (
                <EmptyState title="Chưa có danh mục linh kiện" description="Vui lòng quay lại sau." />
            )}

            {slotsQuery.isSuccess && orderedSlots.length > 0 && (
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                        {orderedSlots.map((slot, i) => (
                            <PcSlotRow
                                key={slot.id}
                                slot={slot}
                                index={i}
                                items={state[slot.id] ?? []}
                                onOpenPicker={() => setPickerSlot(slot)}
                                onRemove={(productId) => removeItem(slot.id, productId)}
                                onQuantityChange={(productId, qty) => setQuantity(slot.id, productId, qty)}
                            />
                        ))}
                    </div>

                    <div className="w-full space-y-4 lg:w-[360px] lg:shrink-0">
                        <PcCompatibilityPanel
                            check={checkQuery.data}
                            isPending={checkQuery.isPending || checkQuery.isFetching}
                            isEmpty={checkItems.length === 0}
                        />
                        <PcSummaryBar
                            check={checkQuery.data}
                            pickedCount={pickedCount}
                            onAddAllToCart={() => void addAllToCart()}
                            addAllRunning={addAllRunning}
                            onSave={() => setSaveOpen(true)}
                            onPrint={handlePrint}
                        />
                    </div>
                </div>
            )}

            <PcPickerDrawer
                open={!!pickerSlot}
                onOpenChange={(open) => { if (!open) setPickerSlot(null); }}
                slot={pickerSlot}
                buildProductIds={buildProductIds}
                selectedProductId={pickerSlot ? state[pickerSlot.id]?.[0]?.productId : undefined}
                onPick={pickerSlot ? handlePick(pickerSlot) : () => undefined}
            />

            <PcSaveShareDialog open={saveOpen} onOpenChange={setSaveOpen} items={checkItems} />
        </div>
    );
};

export default BuildPcPage;
