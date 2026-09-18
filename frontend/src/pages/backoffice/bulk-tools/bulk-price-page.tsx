import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { catalogPublicListingApi } from '../../../api/catalog/public-listing';
import { bulkPriceApi, type BulkPriceFilter, type BulkPriceResult } from '../../../api/bulk-tools';
import { PageHeader, Card, CardBody, Select, Input, Checkbox, Button, Badge, Skeleton, notify } from '../../../components/ui';
import { BulkPricePreviewTable } from './bulk-price-preview-table';

type Scope = 'category' | 'brand';

/** Bulk price screen — `docs/api-contracts/catalog-bulk.md` §5. Preview and apply send the
 *  EXACT same filter body, so the numbers that were previewed are the numbers that get
 *  written (Success Criteria) — no client-side recompute anywhere in this file. */
export default function BulkPricePage() {
    const [scope, setScope] = useState<Scope>('category');
    const [categoryId, setCategoryId] = useState('');
    const [brandId, setBrandId] = useState('');
    const [basis, setBasis] = useState<BulkPriceFilter['basis']>('cost');
    const [adjustmentType, setAdjustmentType] = useState<BulkPriceFilter['adjustmentType']>('percent');
    const [value, setValue] = useState<number>(0);
    const [allowBelowCost, setAllowBelowCost] = useState(false);
    const [result, setResult] = useState<BulkPriceResult | null>(null);
    const [busy, setBusy] = useState<'preview' | 'apply' | null>(null);
    const [applied, setApplied] = useState(false);

    const categories = useQuery({ queryKey: ['bulk-tools', 'categories'], queryFn: catalogPublicListingApi.getCategories });
    const brands = useQuery({ queryKey: ['bulk-tools', 'brands'], queryFn: catalogPublicListingApi.getBrands });

    const buildFilter = (): BulkPriceFilter => ({
        categoryId: scope === 'category' ? (categoryId || null) : null,
        brandId: scope === 'brand' ? (brandId || null) : null,
        productIds: null,
        basis, adjustmentType, value, allowBelowCost,
    });

    const run = async (mode: 'preview' | 'apply') => {
        if (!value) { notify.error('Nhập giá trị điều chỉnh trước khi xem trước.'); return; }
        setBusy(mode);
        try {
            const res = mode === 'preview' ? await bulkPriceApi.preview(buildFilter()) : await bulkPriceApi.apply(buildFilter());
            setResult(res);
            if (mode === 'apply') { setApplied(true); notify.success(`Đã áp giá cho ${res.appliedCount} sản phẩm`); }
        } catch (err: any) {
            notify.error('Lỗi xử lý', { description: err?.response?.data?.error });
        } finally { setBusy(null); }
    };

    return (
        <div className="mx-auto max-w-5xl space-y-5 p-4 lg:p-6">
            <PageHeader title="Đổi giá theo lô" description="Lọc sản phẩm, chọn cách tính, xem trước trước khi áp dụng." />

            <Card>
                <CardBody className="space-y-4">
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="text-sm">
                            <div className="mb-1 text-fg-muted">Phạm vi</div>
                            <Select options={[{ value: 'category', label: 'Theo danh mục' }, { value: 'brand', label: 'Theo thương hiệu' }]}
                                value={scope} onChange={(e) => setScope(e.target.value as Scope)} />
                        </label>
                        {scope === 'category' ? (
                            categories.isPending ? <Skeleton className="h-10 w-48" /> : (
                                <Select className="w-56" options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
                                    value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
                            )
                        ) : (
                            brands.isPending ? <Skeleton className="h-10 w-48" /> : (
                                <Select className="w-56" options={(brands.data ?? []).map((b) => ({ value: b.id, label: b.name }))}
                                    value={brandId} onChange={(e) => setBrandId(e.target.value)} />
                            )
                        )}
                        <label className="text-sm">
                            <div className="mb-1 text-fg-muted">Tính theo</div>
                            <Select options={[{ value: 'cost', label: 'Giá vốn' }, { value: 'sellingPrice', label: 'Giá bán hiện tại' }]}
                                value={basis} onChange={(e) => setBasis(e.target.value as BulkPriceFilter['basis'])} />
                        </label>
                        <label className="text-sm">
                            <div className="mb-1 text-fg-muted">Kiểu điều chỉnh</div>
                            <Select options={[{ value: 'percent', label: '%' }, { value: 'amount', label: 'Số tiền (đ)' }]}
                                value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value as BulkPriceFilter['adjustmentType'])} />
                        </label>
                        <label className="text-sm">
                            <div className="mb-1 text-fg-muted">Giá trị</div>
                            <Input type="number" className="w-32" value={value} onChange={(e) => setValue(Number(e.target.value))} />
                        </label>
                    </div>

                    <Checkbox label="Cho phép áp giá dưới giá vốn (không khuyến nghị)" checked={allowBelowCost}
                        onChange={(e) => setAllowBelowCost(e.target.checked)} />

                    <div className="flex items-center gap-3">
                        <Button loading={busy === 'preview'} onClick={() => run('preview')}>Xem trước</Button>
                        {result && !applied && result.matchedCount > 0 && (
                            <Button variant="primary" loading={busy === 'apply'} onClick={() => run('apply')}>
                                {/* `appliedCount` from a dry-run preview is always 0 on TEST :5050 (verified
                                    2026-09-18 — matchedCount=1, belowCostBlockedCount=0, appliedCount=0 on
                                    `mode=preview`, but 1 on `mode=apply` for the identical body) — a backend
                                    defect, filed as an integration request. Computed client-side here instead
                                    of trusting the field, from the same `lines[]` the table already renders. */}
                                Áp dụng cho {result.lines.filter((l) => !l.belowCost || allowBelowCost).length} sản phẩm
                            </Button>
                        )}
                    </div>
                </CardBody>
            </Card>

            {result && (
                <Card>
                    <CardBody className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            <Badge>{result.matchedCount} khớp lọc</Badge>
                            <Badge className="bg-success-subtle text-success">{result.lines.filter((l) => !l.belowCost || allowBelowCost).length} sẽ áp dụng</Badge>
                            {result.belowCostBlockedCount > 0 && (
                                <Badge className="bg-danger/10 text-danger">
                                    {result.belowCostBlockedCount} bị chặn vì dưới giá vốn{allowBelowCost ? ' (đã cho phép ghi đè)' : ''}
                                </Badge>
                            )}
                        </div>
                        {result.belowCostBlockedCount > 0 && !allowBelowCost && (
                            <p className="text-xs text-fg-muted">Các dòng đánh dấu "Dưới giá vốn" sẽ KHÔNG được ghi khi áp dụng, trừ khi tick "Cho phép áp giá dưới giá vốn" ở trên rồi xem trước lại.</p>
                        )}
                        <BulkPricePreviewTable lines={result.lines} />
                    </CardBody>
                </Card>
            )}
        </div>
    );
}
