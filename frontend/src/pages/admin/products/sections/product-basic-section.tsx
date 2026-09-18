import type { UseFormReturn } from 'react-hook-form';
import { Card, CardBody, CardHeader, CardTitle } from '../../../../components/ui';
import { ComboboxField, TextField } from '../../../../components/form';
import { Textarea } from '../../../../components/ui';
import type { ProductEditorValues } from '../product-editor-schema';

interface Props {
  form: UseFormReturn<ProductEditorValues>;
  categories: Array<{ value: string; label: string }>;
  brands: Array<{ value: string; label: string }>;
}

/** Tab "Thông tin chung": tên, mã, ngành hàng, hãng, đơn vị tính, mô tả. */
export function ProductBasicSection({ form, categories, brands }: Props) {
  const descriptionField = form.register('description');
  return (
    <Card padded>
      <CardHeader>
        <CardTitle>Thông tin chung</CardTitle>
      </CardHeader>
      <CardBody className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="name"
          control={form.control}
          label="Tên sản phẩm"
          required
          placeholder="VD: Laptop Acer Aspire 5 A515-58P"
          className="sm:col-span-2"
        />
        <TextField
          name="sku"
          control={form.control}
          label="Mã SKU"
          placeholder="Bỏ trống để hệ thống tự sinh"
          hint="Dùng để quét mã và đối chiếu kho."
        />
        <TextField name="unitName" control={form.control} label="Đơn vị tính" placeholder="Chiếc" />
        <ComboboxField
          name="categoryId"
          control={form.control}
          label="Ngành hàng"
          required
          options={categories}
          placeholder="Chọn ngành hàng"
          searchPlaceholder="Tìm ngành hàng…"
        />
        <ComboboxField
          name="brandId"
          control={form.control}
          label="Thương hiệu"
          required
          options={brands}
          placeholder="Chọn thương hiệu"
          searchPlaceholder="Tìm thương hiệu…"
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Mô tả"
            rows={6}
            hint="Mô tả hiển thị ở trang chi tiết sản phẩm. Tối đa 4.000 ký tự."
            error={form.formState.errors.description?.message}
            {...descriptionField}
          />
        </div>
      </CardBody>
    </Card>
  );
}
