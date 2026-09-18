import { useController, type UseFormReturn } from 'react-hook-form';
import { CrudFormDialog, NumberField, TextField } from '../../../components/form';
import { Textarea } from '../../../components/ui';
import { TaxonomyImageField } from './taxonomy-image-field';
import { brandFormSchema, type BrandFormValues } from './taxonomy-schemas';
import type { Brand, BrandWriteDto } from '../../../api/catalog/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Brand | null;
  onSubmit: (dto: BrandWriteDto) => Promise<void>;
}

const toValues = (b: Brand | null): BrandFormValues => ({
  name: b?.name ?? '',
  description: b?.description ?? '',
  slug: b?.slug ?? '',
  logoUrl: b?.logoUrl ?? '',
  website: b?.website ?? '',
  displayOrder: b?.displayOrder ?? 0,
});

/** Hộp thoại thêm/sửa thương hiệu — logo, website, thứ tự, SEO slug. */
export function BrandFormDialog({ open, onOpenChange, editing, onSubmit }: Props) {
  return (
    <CrudFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? `Sửa thương hiệu: ${editing.name}` : 'Thêm thương hiệu'}
      schema={brandFormSchema}
      defaultValues={toValues(editing) as never}
      knownFields={['name', 'description', 'slug', 'website']}
      onSubmit={async (values) => {
        await onSubmit({
          name: values.name,
          description: values.description ?? '',
          slug: values.slug || undefined,
          logoUrl: values.logoUrl || null,
          website: values.website || null,
          displayOrder: values.displayOrder ?? 0,
        });
        onOpenChange(false);
      }}
    >
      {(form) => <BrandFields form={form} />}
    </CrudFormDialog>
  );
}

function BrandFields({ form }: { form: UseFormReturn<BrandFormValues> }) {
  const logo = useController({ name: 'logoUrl', control: form.control });
  const description = form.register('description');
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField name="name" control={form.control} label="Tên thương hiệu" required className="sm:col-span-2" />
      <TextField name="website" control={form.control} label="Website" placeholder="https://…" />
      <NumberField name="displayOrder" control={form.control} label="Thứ tự hiển thị" min={0} />
      <div className="sm:col-span-2">
        <TaxonomyImageField
          label="Logo"
          area="brands"
          value={logo.field.value || ''}
          onChange={(url) => logo.field.onChange(url)}
          hint="Nền trong suốt (PNG/WebP) hiển thị đẹp nhất."
        />
      </div>
      <div className="sm:col-span-2">
        <Textarea label="Mô tả" rows={3} error={form.formState.errors.description?.message} {...description} />
      </div>
      <TextField
        name="slug"
        control={form.control}
        label="Đường dẫn"
        placeholder="Bỏ trống để tự sinh"
        className="sm:col-span-2"
      />
    </div>
  );
}
