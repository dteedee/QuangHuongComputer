/**
 * One line of "Tạo phiếu chuyển kho": product search → the stock row of that product in the SOURCE
 * warehouse (one per variant) → quantity → serials when the product's category is serial-tracked.
 * All values live in the page's single RHF form (`items.{index}.*`).
 */
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import { catalogAdminApi } from '../../../../api/catalog/admin';
import { inventoryApi } from '../../../../api/inventory';
import type { Product } from '../../../../api/catalog/types';
import { AsyncSearchableSelect, IconButton, Select } from '../../../../components/ui';
import { FormField, NumberField } from '../../../../components/form';
import { TransferSerialPicker } from './transfer-serial-picker';
import type { TransferFormData } from './transfer-schemas';

interface TransferLineEditorProps {
    index: number;
    fromWarehouseId: string;
    serialTrackedCategoryIds: ReadonlySet<string>;
    onRemove?: () => void;
}

export function TransferLineEditor({ index, fromWarehouseId, serialTrackedCategoryIds, onRemove }: TransferLineEditorProps) {
    const { control, setValue } = useFormContext<TransferFormData>();
    const prefix = `items.${index}` as const;
    const line = useWatch({ control, name: prefix });
    const productField = useController({ control, name: `${prefix}.productId` });
    const rowField = useController({ control, name: `${prefix}.inventoryItemId` });
    const serialField = useController({ control, name: `${prefix}.serialNumbers` });
    const found = useRef(new Map<string, Product>());

    const stockQuery = useQuery({
        queryKey: ['inventory', 'stock', 'transfer-line', line.productId, fromWarehouseId],
        queryFn: () => inventoryApi.stock.getList({ productId: line.productId, warehouseId: fromWarehouseId, pageSize: 50 }),
        enabled: Boolean(line.productId && fromWarehouseId),
    });
    const rows = stockQuery.data?.items ?? [];

    const pickRow = (id: string) => {
        const row = rows.find((r) => r.id === id);
        rowField.field.onChange(id);
        setValue(`${prefix}.available`, row ? row.quantityOnHand - row.reservedQuantity : 0);
    };

    // One stock row (no variants) → pick it for the user.
    useEffect(() => {
        if (rows.length === 1 && !line.inventoryItemId) pickRow(rows[0].id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, line.inventoryItemId]);

    const chooseProduct = (productId: string) => {
        const product = found.current.get(productId);
        productField.field.onChange(productId);
        setValue(`${prefix}.productName`, product?.name ?? '');
        setValue(`${prefix}.serialTracked`, Boolean(product?.categoryId && serialTrackedCategoryIds.has(product.categoryId)));
        setValue(`${prefix}.inventoryItemId`, '');
        setValue(`${prefix}.available`, 0);
        setValue(`${prefix}.serialNumbers`, []);
    };

    return (
        <div className="grid gap-3 rounded-lg border border-line bg-surface p-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_120px_auto] lg:items-start">
            <FormField label="Sản phẩm" required>
                {(a11y) => (
                    <div>
                        <AsyncSearchableSelect
                            id={a11y.id}
                            value={line.productId}
                            defaultLabel={line.productName || undefined}
                            placeholder="Tìm theo tên hoặc SKU"
                            error={Boolean(productField.fieldState.error)}
                            onChange={chooseProduct}
                            loadOptions={async (search, page) => {
                                const res = await catalogAdminApi.listProducts({ search, page, pageSize: 20 });
                                res.products.forEach((p) => found.current.set(p.id, p));
                                return {
                                    options: res.products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` })),
                                    hasMore: res.page * res.pageSize < res.total,
                                };
                            }}
                        />
                        {productField.fieldState.error && (
                            <p role="alert" className="mt-1 text-13 text-danger">{productField.fieldState.error.message}</p>
                        )}
                    </div>
                )}
            </FormField>

            <Select
                label="Dòng tồn ở kho xuất"
                value={line.inventoryItemId}
                disabled={!line.productId || stockQuery.isPending}
                placeholder={line.productId && !stockQuery.isPending && rows.length === 0 ? 'Kho xuất không có hàng này' : 'Chọn'}
                options={rows.map((r) => ({
                    value: r.id,
                    label: `${r.variantName ?? 'Mặc định'} — khả dụng ${r.quantityOnHand - r.reservedQuantity}`,
                }))}
                onChange={(e) => pickRow(e.target.value)}
                error={rowField.fieldState.error?.message}
            />

            <NumberField control={control} name={`${prefix}.quantity`} label="Số lượng" min={1} required />

            {onRemove && (
                <IconButton aria-label="Xoá dòng" variant="ghost" onClick={onRemove} className="lg:mt-6">
                    <Trash2 className="h-4 w-4" />
                </IconButton>
            )}

            {line.serialTracked && line.productId && (
                <div className="lg:col-span-4">
                    <TransferSerialPicker
                        productId={line.productId}
                        warehouseId={fromWarehouseId}
                        quantity={line.quantity || 0}
                        value={line.serialNumbers}
                        onChange={(v) => serialField.field.onChange(v)}
                        error={serialField.fieldState.error?.message}
                    />
                </div>
            )}
        </div>
    );
}
