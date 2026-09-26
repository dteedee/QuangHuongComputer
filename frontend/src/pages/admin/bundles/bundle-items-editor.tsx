import { useCallback, useRef, useState } from 'react';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import { catalogAdminApi } from '../../../api/catalog/admin';
import type { Product } from '../../../api/catalog';
import { AsyncSearchableSelect, Checkbox, IconButton, Img, Money, errorClass } from '../../../components/ui';
import { NumberField } from '../../../components/form';
import type { BundleEditorValues } from './bundle-editor-schema';

const PAGE_SIZE = 15;

/**
 * Chọn sản phẩm của combo: tìm theo tên/SKU (danh sách sản phẩm quản trị), số lượng mỗi bộ,
 * đánh dấu món chính. Giá lẻ hiển thị để tham khảo — server luôn tính lại từ giá hiện hành.
 */
export function BundleItemsEditor({ form }: { form: UseFormReturn<BundleEditorValues> }) {
    const { fields, append, remove, update } = useFieldArray({ control: form.control, name: 'items' });
    const loaded = useRef(new Map<string, Product>());
    const [picker, setPicker] = useState('');

    const loadOptions = useCallback(async (search: string, page: number) => {
        const res = await catalogAdminApi.listProducts({ page, pageSize: PAGE_SIZE, search: search.trim() || undefined });
        res.products.forEach(p => loaded.current.set(p.id, p));
        return {
            options: res.products.map(p => ({ value: p.id, label: `${p.name}${p.sku ? ` (${p.sku})` : ''}` })),
            hasMore: page * PAGE_SIZE < res.total,
        };
    }, []);

    const add = (productId: string) => {
        setPicker('');
        const product = loaded.current.get(productId);
        if (!product || fields.some(f => f.productId === productId)) return;
        append({
            productId, productName: product.name, unitPrice: product.price,
            imageUrl: product.imageUrl ?? undefined, quantity: 1, isMainItem: fields.length === 0,
        });
    };

    const itemsError = form.formState.errors.items;
    const itemsMessage = itemsError?.message ?? itemsError?.root?.message;

    return (
        <div className="space-y-3">
            <AsyncSearchableSelect
                loadOptions={loadOptions}
                value={picker}
                onChange={add}
                placeholder="Thêm sản phẩm vào combo…"
                searchPlaceholder="Tìm theo tên hoặc SKU"
            />
            {fields.length === 0 && <p className="text-13 text-fg-muted">Chưa có sản phẩm nào trong combo.</p>}
            <ul className="divide-y divide-line rounded-lg border border-line">
                {fields.map((field, index) => (
                    <li key={field.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                        <Img src={field.imageUrl ?? null} alt={field.productName} ratio="1/1" fit="contain" blend
                            className="h-10 w-10 shrink-0 rounded-md" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-13 font-medium text-fg">{field.productName}</p>
                            <p className="text-2xs text-fg-subtle">Giá lẻ <Money value={field.unitPrice} /></p>
                        </div>
                        <NumberField name={`items.${index}.quantity`} control={form.control} label="SL" min={1} max={20}
                            className="w-20" />
                        <Checkbox
                            label="Món chính"
                            checked={form.watch(`items.${index}.isMainItem`)}
                            onChange={(e) => update(index, { ...form.getValues(`items.${index}`), isMainItem: e.target.checked })}
                        />
                        <IconButton aria-label={`Bỏ ${field.productName} khỏi combo`} size="sm" variant="ghost" onClick={() => remove(index)}>
                            <Trash2 size={14} />
                        </IconButton>
                    </li>
                ))}
            </ul>
            {itemsMessage && <p role="alert" className={errorClass}>{itemsMessage}</p>}
        </div>
    );
}

export default BundleItemsEditor;
