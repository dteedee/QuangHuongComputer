/**
 * "Tạo phiếu chuyển kho" — route `inventory/transfers/new`. One RHF + zod form
 * (`transfer-schemas.ts`); the server (`TransferCreation.cs`) re-checks stock, warehouse and
 * serials and snapshots product names itself. On success → the transfer's detail page.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { inventoryApi } from '../../../../api/inventory';
import { inventoryTransfersApi } from '../../../../api/inventory-transfers';
import { catalogPublicListingApi } from '../../../../api/catalog/public-listing';
import { Button, Card, CardBody, PageHeader, notify } from '../../../../components/ui';
import { Form, SelectField, TextField } from '../../../../components/form';
import { normalizeApiError } from '../../../../lib/api-error';
import { TransferLineEditor } from './transfer-line-editor';
import {
    emptyTransferLine, toCreateTransferRequest, transferFormSchema, type TransferFormData,
} from './transfer-schemas';
import { paths } from '../../../../routes';

const WAREHOUSE_TYPE_LABELS: Record<string, string> = {
    Main: 'Kho chính', Branch: 'Chi nhánh', Showroom: 'Trưng bày', Transit: 'Trung chuyển',
    Returns: 'Hàng trả', Defective: 'Hàng lỗi',
};

export default function TransferCreatePage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [saving, setSaving] = useState(false);

    const warehousesQuery = useQuery({
        queryKey: ['inventory', 'warehouses', 'dropdown'],
        queryFn: inventoryApi.warehouses.getDropdown,
    });
    const categoriesQuery = useQuery({
        queryKey: ['catalog', 'categories', 'all'],
        queryFn: catalogPublicListingApi.getCategories,
        staleTime: 10 * 60 * 1000,
    });

    const warehouseOptions = useMemo(() => (warehousesQuery.data ?? []).map((w) => ({
        value: w.id,
        label: `${w.name} · ${WAREHOUSE_TYPE_LABELS[w.type] ?? w.type}`,
    })), [warehousesQuery.data]);
    const serialTracked = useMemo(
        () => new Set((categoriesQuery.data ?? []).filter((c) => c.isSerialTracked).map((c) => c.id)),
        [categoriesQuery.data],
    );

    const submit = async (data: TransferFormData) => {
        setSaving(true);
        try {
            const created = await inventoryTransfersApi.create(toCreateTransferRequest(data));
            notify.success(`Đã lập phiếu ${created.transferNumber}`);
            await queryClient.invalidateQueries({ queryKey: ['inventory', 'transfers'] });
            navigate(paths.backoffice.inventoryTransferDetail(created.id));
        } catch (err) {
            notify.error(normalizeApiError(err).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4 px-4 py-4 lg:px-6">
            <PageHeader
                title="Tạo phiếu chuyển kho"
                description="Chuyển hàng giữa kho chính, chi nhánh và kho trưng bày. Hàng theo dõi serial phải chọn đúng từng máy."
                breadcrumbs={[{ label: 'Chuyển kho', to: paths.backoffice.inventoryTransfers() }, { label: 'Tạo phiếu' }]}
            />
            <Form
                schema={transferFormSchema}
                defaultValues={{ fromWarehouseId: '', toWarehouseId: '', notes: '', items: [emptyTransferLine()] }}
                onSubmit={submit}
                mode="onSubmit"
            >
                {(form) => (
                    <TransferFormBody
                        form={form}
                        warehouseOptions={warehouseOptions}
                        serialTracked={serialTracked}
                        saving={saving}
                        onCancel={() => navigate(paths.backoffice.inventoryTransfers())}
                    />
                )}
            </Form>
        </div>
    );
}

interface TransferFormBodyProps {
    form: UseFormReturn<TransferFormData>;
    warehouseOptions: { value: string; label: string }[];
    serialTracked: ReadonlySet<string>;
    saving: boolean;
    onCancel: () => void;
}

function TransferFormBody({ form, warehouseOptions, serialTracked, saving, onCancel }: TransferFormBodyProps) {
    const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: 'items', keyName: 'fieldKey' });
    const fromWarehouseId = form.watch('fromWarehouseId');
    const itemsError = form.formState.errors.items?.root?.message ?? form.formState.errors.items?.message;

    // Đổi kho xuất = mọi dòng tồn đã chọn không còn đúng kho → làm lại danh sách hàng.
    const lastFrom = useRef(fromWarehouseId);
    useEffect(() => {
        if (lastFrom.current && lastFrom.current !== fromWarehouseId) replace([emptyTransferLine()]);
        lastFrom.current = fromWarehouseId;
    }, [fromWarehouseId, replace]);

    return (
        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
            <Card>
                <CardBody className="space-y-3">
                    <h2 className="text-base font-semibold text-fg">Hàng chuyển</h2>
                    {!fromWarehouseId ? (
                        <p className="text-13 text-fg-muted">Chọn kho xuất trước để tìm hàng trong kho đó.</p>
                    ) : (
                        fields.map((field, index) => (
                            <TransferLineEditor
                                key={field.fieldKey}
                                index={index}
                                fromWarehouseId={fromWarehouseId}
                                serialTrackedCategoryIds={serialTracked}
                                onRemove={fields.length > 1 ? () => remove(index) : undefined}
                            />
                        ))
                    )}
                    {itemsError && <p role="alert" className="text-13 text-danger">{itemsError}</p>}
                    <Button type="button" variant="dashed" size="sm" disabled={!fromWarehouseId} onClick={() => append(emptyTransferLine())}>
                        <Plus className="h-4 w-4" aria-hidden /> Thêm mặt hàng
                    </Button>
                </CardBody>
            </Card>

            <Card className="xl:sticky xl:top-4 xl:self-start">
                <CardBody className="space-y-3">
                    <SelectField
                        control={form.control}
                        name="fromWarehouseId"
                        label="Kho xuất"
                        required
                        options={warehouseOptions}
                        placeholder="Chọn kho xuất"
                    />
                    <SelectField
                        control={form.control}
                        name="toWarehouseId"
                        label="Kho nhận"
                        required
                        options={warehouseOptions}
                        placeholder="Chọn kho nhận"
                    />
                    <TextField control={form.control} name="notes" label="Ghi chú" placeholder="Lý do chuyển, người nhận…" />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={onCancel}>Huỷ</Button>
                        <Button type="submit" loading={saving}>Lập phiếu</Button>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
