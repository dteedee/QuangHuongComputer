import type { UseFormReturn } from 'react-hook-form';
import { Card, CardBody, CardHeader, CardTitle } from '../../../../components/ui';
import { TextField } from '../../../../components/form';
import { Textarea } from '../../../../components/ui';
import type { ProductEditorValues } from '../product-editor-schema';

interface Props {
  form: UseFormReturn<ProductEditorValues>;
}

const SITE = 'quanghuongcomputer.vn';

/** Tab "SEO": đường dẫn, thẻ tiêu đề/mô tả + xem trước kết quả tìm kiếm. */
export function ProductSeoSection({ form }: Props) {
  const metaDescriptionField = form.register('metaDescription');
  const slug = form.watch('slug');
  const name = form.watch('name');
  const metaTitle = form.watch('metaTitle');
  const metaDescription = form.watch('metaDescription');

  return (
    <Card padded>
      <CardHeader>
        <CardTitle>Tối ưu tìm kiếm (SEO)</CardTitle>
      </CardHeader>
      <CardBody className="grid gap-4">
        <TextField
          name="slug"
          control={form.control}
          label="Đường dẫn"
          placeholder="tu-sinh-ra-tu-ten-san-pham"
          hint="Bỏ trống để hệ thống tự sinh từ tên sản phẩm và tự thêm hậu tố nếu trùng."
        />
        <TextField
          name="metaTitle"
          control={form.control}
          label="Tiêu đề SEO"
          placeholder={name || 'Tên sản phẩm'}
          hint="Nên dưới 60 ký tự."
        />
        <Textarea
          label="Mô tả SEO"
          rows={3}
          hint="Nên 120–160 ký tự."
          error={form.formState.errors.metaDescription?.message}
          {...metaDescriptionField}
        />
        <TextField
          name="metaKeywords"
          control={form.control}
          label="Từ khoá"
          placeholder="laptop acer, laptop văn phòng"
        />

        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="mb-2 text-xs font-medium text-fg-muted">Xem trước trên Google</p>
          <p className="truncate text-xs text-fg-subtle">
            {SITE}/san-pham/{slug || 'duong-dan-tu-sinh'}
          </p>
          <p className="mt-0.5 truncate text-base text-brand-text">
            {metaTitle || name || 'Tiêu đề sản phẩm'}
          </p>
          <p className="mt-0.5 line-clamp-2 text-13 text-fg-muted">
            {metaDescription || 'Chưa có mô tả SEO — Google sẽ tự trích một đoạn trong phần mô tả sản phẩm.'}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
