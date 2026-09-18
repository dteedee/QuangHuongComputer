import type { UseFormReturn } from 'react-hook-form';
import { Card, CardBody, CardHeader, CardTitle } from '../../../../components/ui';
import { NumberField, SwitchField, TextField } from '../../../../components/form';
import type { ProductEditorValues } from '../product-editor-schema';

interface Props {
  form: UseFormReturn<ProductEditorValues>;
}

/**
 * Tab "Bảo hành & đổi trả" (D08). `isReturnExcluded` chỉ loại sản phẩm khỏi
 * đổi 1-1 và thu lại — KHÔNG bao giờ loại khỏi bảo hành hay khỏi lý do trả
 * hàng theo luật. Câu chữ dưới đây nói đúng điều đó, không nói gọn hơn.
 */
export function ProductWarrantySection({ form }: Props) {
  return (
    <Card padded>
      <CardHeader>
        <CardTitle>Bảo hành &amp; đổi trả</CardTitle>
      </CardHeader>
      <CardBody className="grid gap-4 sm:grid-cols-2">
        <NumberField
          name="warrantyMonths"
          control={form.control}
          label="Bảo hành (tháng)"
          min={0}
          max={120}
          hint="Bỏ trống để dùng chính sách chung của ngành hàng."
        />
        <TextField
          name="warrantyInfo"
          control={form.control}
          label="Ghi chú bảo hành"
          placeholder="VD: Bảo hành tại hãng, 1 đổi 1 trong 30 ngày"
        />
        <div className="sm:col-span-2 rounded-xl border border-line bg-sunken p-4">
          <SwitchField
            name="isReturnExcluded"
            control={form.control}
            label="Không áp dụng đổi 1-1 / thu lại"
            description="Chỉ loại sản phẩm khỏi chương trình đổi 1 đổi 1 và thu mua lại. Sản phẩm VẪN được bảo hành bình thường và vẫn được trả lại theo các lý do luật định (hàng lỗi, sai mô tả…)."
          />
        </div>
      </CardBody>
    </Card>
  );
}
