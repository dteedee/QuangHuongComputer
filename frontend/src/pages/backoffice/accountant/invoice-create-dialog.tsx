/**
 * Lập hoá đơn tay — `POST /accounting/invoices` (contract §1).
 * Unit prices are entered VAT-INCLUSIVE (D01): the server splits
 * `net = round(gross / (1 + rate))` so the sum always matches the order total
 * to the đồng. The dialog therefore shows an indicative total only, and never
 * computes the tax itself (ui-kit §7: "FE không tính thuế").
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button, IconButton, Money, notify } from '../../../components/ui';
import { CrudFormDialog, MoneyField, NumberField, TextField, applyServerErrors } from '../../../components/form';
import { invoicesApi } from '../../../api/accounting';
import { manualInvoiceSchema, type ManualInvoiceFormData } from './accounting-schemas';

const EMPTY_LINE = { description: '', quantity: 1, unitPriceIncludingVat: 0, vatStatutoryRate: 10, discount: 0 };

const DEFAULTS: ManualInvoiceFormData = {
    buyerLegalName: '', buyerTaxCode: '', buyerAddress: '', buyerEmail: '', buyerPhone: '',
    dueDate: '', notes: '', lines: [{ ...EMPTY_LINE }],
};

export interface InvoiceCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (invoiceId: string) => void;
}

export const InvoiceCreateDialog = ({ open, onOpenChange, onCreated }: InvoiceCreateDialogProps) => {
    const queryClient = useQueryClient();
    const [submitting, setSubmitting] = useState(false);

    return (
        <CrudFormDialog<ManualInvoiceFormData>
            open={open}
            onOpenChange={onOpenChange}
            title="Lập hoá đơn tay"
            description="Đơn giá nhập theo giá ĐÃ gồm thuế GTGT; hệ thống tự tách phần thuế."
            size="lg"
            schema={manualInvoiceSchema}
            defaultValues={DEFAULTS}
            submitLabel={submitting ? 'Đang lưu…' : 'Tạo hoá đơn nháp'}
            knownFields={['lines', 'dueDate', 'notes', 'buyerLegalName', 'buyerTaxCode']}
            onSubmit={async (data, form) => {
                setSubmitting(true);
                try {
                    const created = await invoicesApi.create({
                        dueDate: data.dueDate || undefined,
                        notes: data.notes || undefined,
                        buyer: data.buyerLegalName || data.buyerTaxCode
                            ? {
                                  buyerType: data.buyerTaxCode ? 'Organization' : 'Consumer',
                                  legalName: data.buyerLegalName || undefined,
                                  taxCode: data.buyerTaxCode || undefined,
                                  address: data.buyerAddress || undefined,
                                  email: data.buyerEmail || undefined,
                                  phone: data.buyerPhone || undefined,
                              }
                            : undefined,
                        lines: data.lines.map((l) => ({
                            description: l.description,
                            quantity: l.quantity,
                            unitPriceIncludingVat: l.unitPriceIncludingVat,
                            vatStatutoryRate: l.vatStatutoryRate,
                            discount: l.discount || undefined,
                            sku: l.sku || undefined,
                            unitName: l.unitName || undefined,
                        })),
                    });
                    await queryClient.invalidateQueries({ queryKey: ['accounting', 'invoices'] });
                    notify.success('Đã tạo hoá đơn nháp', { description: created.invoiceNumber });
                    onOpenChange(false);
                    onCreated?.(created.id);
                } catch (err) {
                    applyServerErrors(form.setError, err, ['lines', 'dueDate', 'notes']);
                    throw err;
                } finally {
                    setSubmitting(false);
                }
            }}
        >
            {(form) => <InvoiceCreateFields form={form} />}
        </CrudFormDialog>
    );
};

const InvoiceCreateFields = ({ form }: { form: UseFormReturn<ManualInvoiceFormData> }) => {
    const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lines' });
    const lines = form.watch('lines') ?? [];
    const indicativeTotal = lines.reduce(
        (sum, l) => sum + Math.max(0, (Number(l?.quantity) || 0) * (Number(l?.unitPriceIncludingVat) || 0) - (Number(l?.discount) || 0)),
        0,
    );

    return (
        <>
            <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="mb-1 text-sm font-medium text-fg">Người mua (không bắt buộc)</legend>
                <TextField name="buyerLegalName" control={form.control} label="Tên đơn vị / khách hàng" />
                <TextField name="buyerTaxCode" control={form.control} label="Mã số thuế" />
                <TextField name="buyerAddress" control={form.control} label="Địa chỉ" className="sm:col-span-2" />
                <TextField name="buyerEmail" control={form.control} label="Email" type="email" />
                <TextField name="buyerPhone" control={form.control} label="Điện thoại" />
            </fieldset>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-fg">Dòng hàng</h3>
                    <Button type="button" variant="dashed" size="sm" onClick={() => append({ ...EMPTY_LINE })}>
                        <Plus size={14} aria-hidden /> Thêm dòng
                    </Button>
                </div>

                {fields.map((field, index) => (
                    <div key={field.id} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-12">
                        <TextField
                            name={`lines.${index}.description`} control={form.control}
                            label="Diễn giải" required className="sm:col-span-12"
                        />
                        <NumberField name={`lines.${index}.quantity`} control={form.control} label="SL" className="sm:col-span-2" />
                        <MoneyField
                            name={`lines.${index}.unitPriceIncludingVat`} control={form.control}
                            label="Đơn giá (gồm VAT)" className="sm:col-span-4"
                        />
                        <NumberField
                            name={`lines.${index}.vatStatutoryRate`} control={form.control}
                            label="Thuế suất %" className="sm:col-span-2"
                        />
                        <MoneyField name={`lines.${index}.discount`} control={form.control} label="Giảm giá" className="sm:col-span-3" />
                        <div className="flex items-end sm:col-span-1">
                            <IconButton
                                type="button" variant="ghost" aria-label={`Xoá dòng ${index + 1}`}
                                disabled={fields.length === 1} onClick={() => remove(index)}
                            >
                                <Trash2 size={16} aria-hidden />
                            </IconButton>
                        </div>
                    </div>
                ))}

                <p className="flex items-center justify-end gap-2 text-sm text-fg-muted">
                    Tạm tính (đã gồm VAT): <Money value={indicativeTotal} className="text-base font-semibold text-fg" />
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <TextField name="dueDate" control={form.control} label="Hạn thanh toán" type="date" />
                <TextField name="notes" control={form.control} label="Ghi chú" />
            </div>
        </>
    );
};
