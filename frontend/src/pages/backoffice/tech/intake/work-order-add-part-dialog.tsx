import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { ComboboxField, CrudFormDialog, MoneyField, NumberField, SelectField, TextField } from '../../../../components/form';
import { inventoryApi } from '../../../../api/inventory';
import { addPartDefaults, addPartSchema, type AddPartValues } from './work-order-part-schema';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: AddPartValues) => Promise<void>;
}

const SOURCE_OPTIONS = [
    { value: 'stock', label: 'Lấy từ kho (giữ hàng)' },
    { value: 'boughtIn', label: 'Mua ngoài (không qua kho)' },
];

/** Add a part to the work order: from stock (server reserves it) or bought-in (cost price, no stock movement). */
export function WorkOrderAddPartDialog({ open, onOpenChange, onSubmit }: Props) {
    return (
        <CrudFormDialog<AddPartValues>
            open={open}
            onOpenChange={onOpenChange}
            title="Thêm linh kiện"
            description="Đơn giá bán nhập theo đồng, đã gồm VAT."
            schema={addPartSchema}
            defaultValues={addPartDefaults}
            knownFields={['inventoryItemId', 'partName', 'partNumber', 'serialNumber', 'quantity', 'unitPrice', 'unitCost']}
            onSubmit={async (values) => { await onSubmit(values); onOpenChange(false); }}
        >
            {(form) => <PartFields form={form} open={open} />}
        </CrudFormDialog>
    );
}

function PartFields({ form, open }: { form: UseFormReturn<AddPartValues>; open: boolean }) {
    const source = useWatch({ control: form.control, name: 'source' });
    const inventory = useQuery({ queryKey: ['inventory-items-for-parts'], queryFn: () => inventoryApi.getInventory(), enabled: open && source === 'stock', staleTime: 5 * 60 * 1000 });
    const options = (inventory.data ?? []).map((i) => ({ value: i.id, label: `${i.productName || i.sku} · ${i.sku} · SL ${i.quantity}` }));

    // Chọn linh kiện trong kho ⇒ chép tên + SKU một lần mỗi khi lựa chọn đổi (vẫn sửa tay được).
    const pickedId = useWatch({ control: form.control, name: 'inventoryItemId' });
    const lastPicked = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (!pickedId || pickedId === lastPicked.current) return;
        const item = inventory.data?.find((i) => i.id === pickedId);
        if (!item) return;
        lastPicked.current = pickedId;
        form.setValue('partName', item.productName || item.sku, { shouldValidate: true, shouldDirty: true });
        form.setValue('partNumber', item.sku, { shouldDirty: true });
    }, [pickedId, inventory.data, form]);

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <SelectField name="source" control={form.control} label="Nguồn linh kiện" options={SOURCE_OPTIONS} className="sm:col-span-2" />
            {source === 'stock' && (
                <ComboboxField name="inventoryItemId" control={form.control} label="Linh kiện trong kho" options={options} className="sm:col-span-2"
                    placeholder={inventory.isPending ? 'Đang tải kho…' : 'Chọn linh kiện'} searchPlaceholder="Tìm theo tên hoặc SKU" />
            )}
            <TextField name="partName" control={form.control} label={source === 'stock' ? 'Tên linh kiện' : 'Mô tả linh kiện mua ngoài'} required className="sm:col-span-2" />
            <TextField name="partNumber" control={form.control} label="Mã linh kiện / SKU" />
            <TextField name="serialNumber" control={form.control} label="Số serial" />
            <NumberField name="quantity" control={form.control} label="Số lượng" min={1} step={1} required />
            <MoneyField name="unitPrice" control={form.control} label="Đơn giá bán" currencyLabel="₫" required />
            {source === 'boughtIn' && <MoneyField name="unitCost" control={form.control} label="Giá vốn (giá mua vào)" currencyLabel="₫" required />}
        </div>
    );
}
