/**
 * Tồn kho (W3-12 rewrite) — reads/writes `docs/api-contracts/inventory-stock.md` §2 only.
 * Replaces `InventoryPortal.tsx`, which edited `Products.StockQuantity` through Catalog
 * (`catalogApi.updateProduct`) — no reason, no movement row, and it nulled the product's
 * SEO fields on every save. This page never calls a Catalog endpoint.
 *
 * D08/D09: warehouses carry `isSellable` — `KHO-LOI` (defective) stock is shown but
 * badged apart so it is never read as sellable/available.
 */
import { useMemo, useState } from 'react';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { PackageSearch } from 'lucide-react';
import {
    PageHeader, Card, Input, Select, Switch, Money, DataTable, Pagination,
    StatusBadge, notify, Drawer, Table, THead, TBody, Tr, Th, Td,
} from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import { CrudFormDialog } from '../../../components/form';
import { NumberField, TextField } from '../../../components/form/form-inputs';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { inventoryApi, type StockRow } from '../../../api/inventory';
import { catalogApi } from '../../../api/catalog';
import { stockAdjustSchema, type StockAdjustFormData } from './stock-schemas';

/** D09: only `Defective` warehouses (`KHO-LOI`) are non-sellable — everything else is. */
function isSellableType(type: string): boolean {
    return type !== 'Defective';
}

export default function StockPage() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [adjustRow, setAdjustRow] = useState<StockRow | null>(null);
    const [historyRow, setHistoryRow] = useState<StockRow | null>(null);
    const pageSize = 20;

    const warehousesQuery = useQuery({
        queryKey: ['inventory', 'warehouses', 'dropdown'],
        queryFn: inventoryApi.warehouses.getDropdown,
    });

    const stockQuery = useQuery({
        queryKey: ['inventory', 'stock', { page, search, warehouseId, lowStockOnly }],
        queryFn: () => inventoryApi.stock.getList({
            page, pageSize, search: search || undefined,
            warehouseId: warehouseId || undefined,
            lowStockOnly: lowStockOnly || undefined,
        }),
        placeholderData: (prev) => prev,
    });

    const movementsQuery = useQuery({
        queryKey: ['inventory', 'movements', historyRow?.productId],
        queryFn: () => inventoryApi.movements.getList({ productId: historyRow!.productId, pageSize: 50 }),
        enabled: !!historyRow,
    });

    const warehouseOptions = useMemo(() => [
        { value: '', label: 'Tất cả kho' },
        ...(warehousesQuery.data ?? []).map((w) => ({ value: w.id, label: w.name })),
    ], [warehousesQuery.data]);

    /** `id -> { name, isSellable }`. Backend `GET /inventory/stock` does not project
     * `warehouseName`/`isSellable` (see integration-requests-w3.md) — joined here from
     * the dropdown we already fetch, so the D08/D09 sellable-vs-defective split is real. */
    const warehouseMap = useMemo(() => {
        const map = new Map<string, { name: string; isSellable: boolean }>();
        for (const w of warehousesQuery.data ?? []) map.set(w.id, { name: w.name, isSellable: isSellableType(w.type) });
        return map;
    }, [warehousesQuery.data]);

    // Backend also omits `productName`/`sku` on stock rows — join client-side from
    // Catalog (read-only GET, one request per unique product on the current page).
    const rows = useMemo(() => stockQuery.data?.items ?? [], [stockQuery.data]);
    const uniqueProductIds = useMemo(() => Array.from(new Set(rows.map((r) => r.productId))), [rows]);
    const productQueries = useQueries({
        queries: uniqueProductIds.map((id) => ({
            queryKey: ['catalog', 'product', id],
            queryFn: () => catalogApi.getProduct(id),
            staleTime: 5 * 60 * 1000,
        })),
    });
    const productMap = useMemo(() => {
        const map = new Map<string, { name: string; sku: string }>();
        uniqueProductIds.forEach((id, i) => {
            const p = productQueries[i]?.data;
            if (p) map.set(id, { name: p.name, sku: p.sku });
        });
        return map;
    }, [uniqueProductIds, productQueries]);

    const columns: DataTableColumn<StockRow>[] = [
        {
            id: 'product', header: 'Sản phẩm', locked: true,
            cell: (r) => {
                const p = productMap.get(r.productId);
                return (
                    <div>
                        <div className="font-medium text-fg">{p?.name ?? r.productName ?? '(đang tải...)'}</div>
                        {(p?.sku ?? r.sku) && <div className="text-xs text-fg-subtle">{p?.sku ?? r.sku}{r.variantName ? ` · ${r.variantName}` : ''}</div>}
                    </div>
                );
            },
        },
        {
            id: 'warehouse', header: 'Kho',
            cell: (r) => {
                const w = r.warehouseId ? warehouseMap.get(r.warehouseId) : undefined;
                const name = w?.name ?? r.warehouseName;
                if (!name) return <span className="text-fg-subtle">—</span>;
                return (
                    <StatusBadge tone={w?.isSellable === false ? 'danger' : 'success'}>{name}</StatusBadge>
                );
            },
        },
        {
            id: 'onHand', header: 'Tồn kho', align: 'right', sortable: true,
            cell: (r) => <span className={r.lowStockThreshold != null && r.quantityOnHand <= r.lowStockThreshold ? 'num text-warning font-semibold' : 'num'}>{r.quantityOnHand}</span>,
        },
        { id: 'reserved', header: 'Đã giữ', align: 'right', cell: (r) => <span className="num">{r.reservedQuantity}</span> },
        { id: 'available', header: 'Có thể bán', align: 'right', cell: (r) => <span className="num">{r.availableQuantity}</span> },
        { id: 'avgCost', header: 'Giá vốn TB', align: 'right', sortable: true, cell: (r) => <Money value={r.averageCost} /> },
        {
            id: 'updated', header: 'Cập nhật', defaultHidden: true,
            cell: (r) => r.lastStockUpdate ? new Date(r.lastStockUpdate).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—',
        },
        {
            id: 'actions', header: '', locked: true, align: 'right',
            cell: (r) => (
                <div className="flex justify-end gap-2">
                    <button className="text-xs font-medium text-brand hover:underline" onClick={() => setHistoryRow(r)}>Lịch sử</button>
                    <Can permission={PERMISSIONS.INVENTORY_ADJUST_STOCK}>
                        <button className="text-xs font-medium text-brand hover:underline" onClick={() => setAdjustRow(r)}>Điều chỉnh</button>
                    </Can>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-5">
            <PageHeader
                title="Tồn kho"
                description="Số lượng tồn thực tế theo kho — mọi thay đổi phải có lý do và để lại lịch sử."
                breadcrumbs={[{ label: 'Kho hàng', to: '/backoffice/inventory' }, { label: 'Tồn kho' }]}
            />

            <Card className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
                    <Input
                        label="Tìm sản phẩm / SKU" className="sm:w-64" value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Tên sản phẩm hoặc SKU..."
                    />
                    <Select
                        label="Kho" className="sm:w-56" value={warehouseId}
                        onChange={(e) => { setWarehouseId(e.target.value); setPage(1); }}
                        options={warehouseOptions}
                    />
                    <Switch
                        label="Chỉ hàng sắp hết"
                        checked={lowStockOnly}
                        onCheckedChange={(v) => { setLowStockOnly(v); setPage(1); }}
                    />
                </div>
            </Card>

            <DataTable
                caption="Danh sách tồn kho"
                columns={columns}
                rows={stockQuery.data ? rows : undefined}
                rowKey={(r) => r.id}
                loading={stockQuery.isPending}
                error={stockQuery.error}
                onRetry={stockQuery.refetch}
                enableColumnVisibility
                empty={{
                    icon: PackageSearch,
                    title: 'Không có dòng tồn kho nào',
                    description: search || warehouseId || lowStockOnly
                        ? 'Không khớp bộ lọc hiện tại — thử bỏ bớt điều kiện.'
                        : 'Chưa có dữ liệu tồn kho.',
                }}
                pagination={
                    <Pagination page={page} pageSize={pageSize} total={stockQuery.data?.total ?? 0} onPageChange={setPage} />
                }
            />

            <CrudFormDialog<StockAdjustFormData>
                open={!!adjustRow} onOpenChange={(o) => !o && setAdjustRow(null)}
                title={`Điều chỉnh tồn kho${adjustRow ? ` — ${productMap.get(adjustRow.productId)?.name ?? adjustRow.productName ?? ''}` : ''}`}
                description="Số dương = tăng, số âm = giảm. Lý do là bắt buộc và được lưu vào lịch sử di chuyển."
                schema={stockAdjustSchema}
                defaultValues={{ amount: 0, reason: '' }}
                submitLabel="Ghi nhận điều chỉnh"
                knownFields={['amount', 'reason']}
                onSubmit={async (data) => {
                    if (!adjustRow) return;
                    await inventoryApi.stock.adjust(adjustRow.id, data.amount, data.reason);
                    await queryClient.invalidateQueries({ queryKey: ['inventory', 'stock'] });
                    await queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] });
                    notify.success('Đã ghi nhận điều chỉnh tồn kho');
                    setAdjustRow(null);
                }}
            >
                {(form) => (
                    <>
                        <NumberField name="amount" control={form.control} label="Số lượng điều chỉnh" />
                        <TextField name="reason" control={form.control} label="Lý do" required placeholder="Ví dụ: kiểm kê phát hiện thiếu, hàng vỡ..." />
                    </>
                )}
            </CrudFormDialog>

            <Drawer open={!!historyRow} onOpenChange={(o) => !o && setHistoryRow(null)} title={`Lịch sử di chuyển — ${historyRow ? (productMap.get(historyRow.productId)?.name ?? historyRow.productName ?? '') : ''}`} side="right">
                {movementsQuery.isPending ? (
                    <p className="p-4 text-sm text-fg-muted">Đang tải…</p>
                ) : movementsQuery.isError ? (
                    <p className="p-4 text-sm text-danger">Lỗi tải lịch sử. <button className="underline" onClick={() => movementsQuery.refetch()}>Thử lại</button></p>
                ) : !movementsQuery.data?.items.length ? (
                    <p className="p-4 text-sm text-fg-muted">Chưa có giao dịch nào cho sản phẩm này.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <caption className="sr-only">Lịch sử di chuyển tồn kho</caption>
                            <THead>
                                <Tr>
                                    <Th>Ngày</Th><Th>Loại</Th><Th>Lý do</Th><Th align="right">SL</Th><Th align="right">Tồn sau</Th><Th>Người thực hiện</Th><Th>Tham chiếu</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {movementsQuery.data.items.map((m) => (
                                    <Tr key={m.id}>
                                        <Td className="text-xs">{new Date(m.movementDate).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</Td>
                                        <Td>{m.type}</Td>
                                        <Td className="text-xs">{m.reason}</Td>
                                        <Td align="right"><span className="num">{m.quantity}</span></Td>
                                        <Td align="right"><span className="num">{m.balanceAfter ?? '—'}</span></Td>
                                        <Td className="text-xs">{m.performedBy ?? '—'}</Td>
                                        <Td className="text-xs">{m.documentReference ?? m.referenceType ?? '—'}</Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
