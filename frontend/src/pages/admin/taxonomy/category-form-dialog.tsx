import { useController, type UseFormReturn } from 'react-hook-form';
import { CrudFormDialog, NumberField, SelectField, SwitchField, TextField } from '../../../components/form';
import { Textarea } from '../../../components/ui';
import { TaxonomyImageField } from './taxonomy-image-field';
import { VAT_RATE_OPTIONS, categoryFormSchema, type CategoryFormValues } from './taxonomy-schemas';
import type { Category, CategoryWriteDto } from '../../../api/catalog/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Category | null;
  /** Mọi ngành hàng khác, để chọn cấp cha (không cho chọn chính nó). */
  parentOptions: Array<{ value: string; label: string }>;
  onSubmit: (dto: CategoryWriteDto) => Promise<void>;
}

const toValues = (c: Category | null): CategoryFormValues => ({
  name: c?.name ?? '',
  description: c?.description ?? '',
  parentId: c?.parentId ?? '',
  slug: c?.slug ?? '',
  imageUrl: c?.imageUrl ?? '',
  icon: c?.icon ?? '',
  displayOrder: c?.displayOrder ?? 0,
  vatRate: String(c?.vatRate ?? 0.1),
  vatReductionEligible: c?.vatReductionEligible ?? false,
  isSerialTracked: c?.isSerialTracked ?? false,
  metaTitle: c?.metaTitle ?? '',
  metaDescription: c?.metaDescription ?? '',
});

/** Hộp thoại thêm/sửa ngành hàng — đủ trường của D01 (VAT) và D08 (serial). */
export function CategoryFormDialog({ open, onOpenChange, editing, parentOptions, onSubmit }: Props) {
  return (
    <CrudFormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={editing ? `Sửa ngành hàng: ${editing.name}` : 'Thêm ngành hàng'}
      schema={categoryFormSchema}
      defaultValues={toValues(editing) as never}
      knownFields={['name', 'description', 'slug', 'parentId', 'metaTitle', 'metaDescription']}
      onSubmit={async (values) => {
        await onSubmit({
          name: values.name,
          description: values.description ?? '',
          parentId: values.parentId || null,
          clearParent: !values.parentId,
          slug: values.slug || undefined,
          imageUrl: values.imageUrl || null,
          icon: values.icon || null,
          displayOrder: values.displayOrder ?? 0,
          vatRate: Number(values.vatRate),
          vatReductionEligible: values.vatReductionEligible ?? false,
          isSerialTracked: values.isSerialTracked ?? false,
          metaTitle: values.metaTitle || null,
          metaDescription: values.metaDescription || null,
        });
        onOpenChange(false);
      }}
    >
      {(form) => <CategoryFields form={form} parentOptions={parentOptions} editingId={editing?.id} />}
    </CrudFormDialog>
  );
}

function CategoryFields({
  form, parentOptions, editingId,
}: {
  form: UseFormReturn<CategoryFormValues>;
  parentOptions: Array<{ value: string; label: string }>;
  editingId?: string;
}) {
  const image = useController({ name: 'imageUrl', control: form.control });
  const description = form.register('description');
  const metaDescription = form.register('metaDescription');

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField name="name" control={form.control} label="Tên ngành hàng" required className="sm:col-span-2" />
      <SelectField
        name="parentId"
        control={form.control}
        label="Ngành hàng cha"
        options={[
          { value: '', label: '— Cấp gốc —' },
          ...parentOptions.filter((o) => o.value !== editingId),
        ]}
      />
      <NumberField name="displayOrder" control={form.control} label="Thứ tự hiển thị" min={0} />
      <SelectField
        name="vatRate"
        control={form.control}
        label="Thuế suất VAT"
        required
        options={VAT_RATE_OPTIONS}
      />
      <TextField name="icon" control={form.control} label="Biểu tượng" placeholder="VD: Laptop" />
      <div className="sm:col-span-2 space-y-3 rounded-xl border border-line bg-sunken p-4">
        <SwitchField
          name="vatReductionEligible"
          control={form.control}
          label="Được giảm thuế theo nghị quyết"
          description="Bật khi ngành hàng thuộc diện giảm VAT theo nghị quyết hiện hành. Mức thuế thực tế do module Bán hàng/Kế toán tính."
        />
        <SwitchField
          name="isSerialTracked"
          control={form.control}
          label="Quản lý theo số sê-ri"
          description="Mọi sản phẩm trong ngành hàng này phải nhập/xuất kèm số sê-ri."
        />
      </div>
      <div className="sm:col-span-2">
        <Textarea label="Mô tả" rows={3} error={form.formState.errors.description?.message} {...description} />
      </div>
      <div className="sm:col-span-2">
        <TaxonomyImageField
          label="Ảnh ngành hàng"
          area="categories"
          value={image.field.value || ''}
          onChange={(url) => image.field.onChange(url)}
          hint="Hiện ở trang danh mục của cửa hàng."
        />
      </div>
      <TextField
        name="slug"
        control={form.control}
        label="Đường dẫn"
        placeholder="Bỏ trống để tự sinh"
        className="sm:col-span-2"
      />
      <TextField name="metaTitle" control={form.control} label="Tiêu đề SEO" className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <Textarea
          label="Mô tả SEO"
          rows={2}
          error={form.formState.errors.metaDescription?.message}
          {...metaDescription}
        />
      </div>
    </div>
  );
}
