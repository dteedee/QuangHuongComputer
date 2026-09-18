import type { UseFormReturn } from 'react-hook-form';
import { Button, Card, CardBody, CardHeader, CardTitle, Money } from '../../../../components/ui';
import { MoneyField } from '../../../../components/form';
import type { ProductEditorValues } from '../product-editor-schema';

interface Props {
  form: UseFormReturn<ProductEditorValues>;
}

/**
 * Tab "Giá bán". Mọi số tiền là VND nguyên và ĐÃ gồm VAT (D01) — front-end
 * không bao giờ tự tính thuế.
 */
export function ProductPricingSection({ form }: Props) {
  const price = form.watch('price') ?? 0;
  const oldPrice = form.watch('oldPrice');
  const cost = form.watch('costPrice');

  const margin = cost && cost > 0 && price > 0 ? ((price - cost) / price) * 100 : null;
  const discount = oldPrice && oldPrice > price ? ((oldPrice - price) / oldPrice) * 100 : null;

  return (
    <Card padded>
      <CardHeader>
        <CardTitle>Giá bán</CardTitle>
      </CardHeader>
      <CardBody className="grid gap-4 sm:grid-cols-2">
        <MoneyField name="price" control={form.control} label="Giá bán" required min={0} />
        <div className="space-y-1.5">
          <MoneyField
            name="oldPrice"
            control={form.control}
            label="Giá niêm yết"
            min={0}
            hint="Hiện gạch ngang cạnh giá bán. Bỏ trống nếu không khuyến mãi."
          />
          {oldPrice !== undefined && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => form.setValue('oldPrice', undefined, { shouldDirty: true, shouldValidate: true })}
            >
              Xoá giá niêm yết
            </Button>
          )}
        </div>
        <MoneyField
          name="costPrice"
          control={form.control}
          label="Giá vốn"
          min={0}
          hint="Chỉ nhân viên nhìn thấy. Dùng để tính lãi gộp."
        />
        <dl className="grid content-end gap-2 rounded-xl bg-sunken p-4 text-13">
          <div className="flex items-center justify-between">
            <dt className="text-fg-muted">Lãi gộp</dt>
            <dd className="num font-semibold">
              {margin === null ? '—' : `${margin.toFixed(1)}%`}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-fg-muted">Tiền lãi / sản phẩm</dt>
            <dd className="font-semibold">
              {cost && cost > 0 ? <Money value={price - cost} /> : '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-fg-muted">Mức giảm hiển thị</dt>
            <dd className="num font-semibold">
              {discount === null ? '—' : `-${discount.toFixed(0)}%`}
            </dd>
          </div>
          <p className="pt-1 text-xs text-fg-subtle">Giá đã bao gồm VAT (D01).</p>
        </dl>
      </CardBody>
    </Card>
  );
}
