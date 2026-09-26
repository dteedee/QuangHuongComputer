import { useEffect, useState } from 'react';
import { useFieldArray, useWatch, type FieldPath } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Package, Plus, Wrench } from 'lucide-react';
import { useAppForm, MoneyField, NumberField } from '../../../../components/form';
import { Button, Dialog, Select, Textarea, notify } from '../../../../components/ui';
import { RepairQuoteBreakdown } from '../../../../components/repair/repair-quote-breakdown';
import { breakdownFromQuote } from '../../../../components/repair/repair-quote-breakdown-adapters';
import { normalizeApiError } from '../../../../lib/api-error';
import { queryKeys } from '../../../../lib/query-keys';
import { repairAdminApi } from '../../../../api/repair/admin';
import { repairServiceTypesApi } from '../../../../api/repair/service-types';
import type { RepairQuote } from '../../../../api/repair/quote-types';
import {
    emptyLine, repairQuoteFormSchema, serviceLine, toFormPath, toUpsertInput, valuesFromQuote,
    type RepairQuoteFormValues, type RepairQuoteLineValues,
} from './repair-quote-form-schema';
import { RepairQuoteLineRow } from './repair-quote-line-row';
import { useRepairQuotePreview } from './use-repair-quote-preview';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workOrderId: string;
    /** Pending quote being edited; null = create a new quote from `initialLines`. */
    editing: RepairQuote | null;
    initialLines: RepairQuoteLineValues[];
    /** Parts already on the work order, offered as "add from parts used". */
    partLines: RepairQuoteLineValues[];
    onSaved: () => void;
}

/**
 * Itemised quote editor (create + edit). The technician types lines; totals,
 * discount allocation and VAT shown here come from the server preview, and the
 * saved quote is recomputed server-side again — the SPA never sums money.
 */
export function RepairQuoteEditorDialog({ open, onOpenChange, workOrderId, editing, initialLines, partLines, onSaved }: Props) {
    const defaults: RepairQuoteFormValues = editing
        ? valuesFromQuote(editing)
        : { lines: initialLines, discountAmount: 0, estimatedHours: 1, hourlyRate: 0, description: '', notes: '' };
    const form = useAppForm<RepairQuoteFormValues>({ schema: repairQuoteFormSchema, defaultValues: defaults, mode: 'onChange' });
    const lines = useFieldArray({ control: form.control, name: 'lines' });
    const draft = useWatch({ control: form.control });
    const { preview, isFetching, isDraftValid } = useRepairQuotePreview(workOrderId, draft, open);
    const [serviceToAdd, setServiceToAdd] = useState('');

    useEffect(() => {
        if (open) form.reset(defaults);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const services = useQuery({ queryKey: [...queryKeys.repair.all, 'service-types', 'active'], queryFn: repairServiceTypesApi.listActive, enabled: open });

    const save = useMutation({
        mutationFn: (values: RepairQuoteFormValues) => editing
            ? repairAdminApi.quotes.update(editing.id, toUpsertInput(values))
            : repairAdminApi.technician.createQuote(workOrderId, toUpsertInput(values)),
        onSuccess: () => {
            notify.success(editing ? 'Đã lưu báo giá' : 'Đã tạo báo giá');
            onOpenChange(false);
            onSaved();
        },
        onError: (error) => {
            const normalized = normalizeApiError(error);
            const fields = Object.entries(normalized.fieldErrors);
            fields.forEach(([field, message]) => form.setError(toFormPath(field) as FieldPath<RepairQuoteFormValues>, { message }));
            if (fields.length === 0) notify.error('Không lưu được báo giá', { description: normalized.message });
        },
    });

    const addService = (id: string) => {
        const s = services.data?.find((x) => x.id === id);
        if (s) lines.append(serviceLine(s));
        setServiceToAdd('');
    };

    const footer = (
        <div className="flex w-full items-center justify-between gap-3">
            <span className="text-xs text-fg-subtle">{isFetching ? 'Đang tính lại…' : isDraftValid ? 'Tổng do máy chủ tính, đã gồm VAT.' : 'Hoàn thiện các dòng để xem tổng.'}</span>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
                <Button loading={save.isPending} onClick={form.handleSubmit((v) => save.mutate(v))}>
                    {editing ? 'Lưu báo giá' : 'Tạo báo giá'}
                </Button>
            </div>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange} size="xl" footer={footer}
            title={editing ? `Sửa báo giá ${editing.quoteNumber}` : 'Tạo báo giá'}
            description="Đơn giá và giảm giá nhập theo đồng, đã gồm VAT.">
            <div className="space-y-4">
                <div className="hidden grid-cols-[7rem_minmax(0,1fr)_5rem_8rem_7rem_7rem_2rem] gap-2 text-xs text-fg-subtle md:grid">
                    <span>Loại</span><span>Nội dung</span><span>SL</span><span>Đơn giá</span><span>Giảm</span><span className="text-right">Thành tiền</span><span />
                </div>
                {lines.fields.map((field, index) => (
                    <RepairQuoteLineRow key={field.id} form={form} index={index} canRemove={lines.fields.length > 1}
                        lineTotal={preview?.lines[index]?.lineTotal} onRemove={() => lines.remove(index)} />
                ))}
                {form.formState.errors.lines?.root?.message && <p className="text-xs text-danger">{form.formState.errors.lines.root.message}</p>}

                <div className="flex flex-wrap items-end gap-2">
                    <Button variant="dashed" size="sm" icon={Plus} onClick={() => lines.append(emptyLine('Labor'))}>Thêm dòng</Button>
                    {partLines.length > 0 && (
                        <Button variant="dashed" size="sm" icon={Package} onClick={() => lines.append(partLines)}>Thêm linh kiện đã dùng</Button>
                    )}
                    <div className="flex items-end gap-2">
                        <Select label="Dịch vụ trong danh mục" className="w-60" value={serviceToAdd} placeholder="Chọn dịch vụ…"
                            options={(services.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
                            onChange={(e) => setServiceToAdd(e.target.value)} />
                        <Button variant="outline" size="sm" icon={Wrench} disabled={!serviceToAdd} onClick={() => addService(serviceToAdd)}>Thêm dịch vụ</Button>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <MoneyField name="discountAmount" control={form.control} label="Giảm giá cả phiếu" currencyLabel="₫" />
                    <NumberField name="estimatedHours" control={form.control} label="Số giờ ước tính" min={0} step={0.5} />
                    <MoneyField name="hourlyRate" control={form.control} label="Đơn giá giờ công (tham khảo)" currencyLabel="₫" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <Textarea label="Mô tả công việc" rows={2} {...form.register('description')} error={form.formState.errors.description?.message} />
                    <Textarea label="Ghi chú cho khách" rows={2} {...form.register('notes')} error={form.formState.errors.notes?.message} />
                </div>

                {preview && <RepairQuoteBreakdown {...breakdownFromQuote(preview)} caption="Xem trước báo giá" />}
            </div>
        </Dialog>
    );
}
