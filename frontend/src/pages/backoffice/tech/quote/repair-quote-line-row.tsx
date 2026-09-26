import { Trash2 } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { MoneyField, NumberField, SelectField, TextField } from '../../../../components/form';
import { IconButton, Money } from '../../../../components/ui';
import { KIND_OPTIONS, type RepairQuoteFormValues } from './repair-quote-form-schema';

interface Props {
    form: UseFormReturn<RepairQuoteFormValues>;
    index: number;
    /** Server-computed line total from the latest preview (undefined while pending/invalid). */
    lineTotal?: number;
    canRemove: boolean;
    onRemove: () => void;
}

const srOnly = (text: string) => <span className="sr-only">{text}</span>;

/** One editable quote line. Column headers live in the dialog (md+); labels here are for screen readers. */
export function RepairQuoteLineRow({ form, index, lineTotal, canRemove, onRemove }: Props) {
    const n = index + 1;
    return (
        <div className="grid grid-cols-2 gap-2 border-b border-line py-2 md:grid-cols-[7rem_minmax(0,1fr)_5rem_8rem_7rem_7rem_2rem] md:items-start">
            <SelectField name={`lines.${index}.kind`} control={form.control} label={srOnly(`Loại dòng ${n}`)} options={KIND_OPTIONS} />
            <TextField name={`lines.${index}.description`} control={form.control} label={srOnly(`Nội dung dòng ${n}`)}
                placeholder="Nội dung" className="col-span-2 md:col-span-1" />
            <NumberField name={`lines.${index}.quantity`} control={form.control} label={srOnly(`Số lượng dòng ${n}`)} min={0} step={0.5} />
            <MoneyField name={`lines.${index}.unitPrice`} control={form.control} label={srOnly(`Đơn giá dòng ${n}`)} currencyLabel="₫" />
            <MoneyField name={`lines.${index}.lineDiscount`} control={form.control} label={srOnly(`Giảm giá dòng ${n}`)} currencyLabel="₫" />
            <div className="flex h-10 items-center justify-end text-13 font-medium" aria-live="polite">
                <span className="sr-only">Thành tiền dòng {n}: </span>
                <Money value={lineTotal ?? null} />
            </div>
            <IconButton aria-label={`Xoá dòng ${n}`} variant="ghost" size="sm" disabled={!canRemove} onClick={onRemove}>
                <Trash2 size={15} />
            </IconButton>
        </div>
    );
}
