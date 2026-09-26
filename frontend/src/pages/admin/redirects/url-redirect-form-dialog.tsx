import { useWatch, type UseFormReturn } from 'react-hook-form';
import { CrudFormDialog, SelectField, SwitchField, TextField } from '../../../components/form';
import { Textarea } from '../../../components/ui';
import type { UrlRedirect, UrlRedirectWriteDto } from '../../../api/content/url-redirects';
import {
  STATUS_OPTIONS, toFormValues, toWriteDto, urlRedirectFormSchema, type UrlRedirectFormValues,
} from './url-redirect-schema';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: UrlRedirect | null;
  onSubmit: (dto: UrlRedirectWriteDto) => Promise<void>;
}

/** Thêm/sửa một chuyển hướng. Lỗi chuỗi/vòng lặp/trùng do máy chủ trả về hiện ngay trên form. */
export function UrlRedirectFormDialog({ open, onOpenChange, editing, onSubmit }: Props) {
  return (
    <CrudFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Sửa chuyển hướng' : 'Thêm chuyển hướng'}
      description="Đường dẫn cũ luôn được lưu dạng chữ thường, bỏ dấu / cuối và bỏ tham số ?…"
      schema={urlRedirectFormSchema}
      defaultValues={toFormValues(editing)}
      knownFields={['fromPath', 'toPath', 'statusCode', 'note']}
      onSubmit={async (values) => {
        await onSubmit(toWriteDto(values));
        onOpenChange(false);
      }}
    >
      {(form) => <RedirectFields form={form} />}
    </CrudFormDialog>
  );
}

function RedirectFields({ form }: { form: UseFormReturn<UrlRedirectFormValues> }) {
  const status = useWatch({ control: form.control, name: 'statusCode' });
  const note = form.register('note');
  return (
    <div className="grid gap-4">
      <TextField
        name="fromPath"
        control={form.control}
        label="Đường dẫn cũ"
        required
        placeholder="/san-pham-cu.html hoặc https://web-cu.vn/…"
      />
      <SelectField name="statusCode" control={form.control} label="Kiểu chuyển hướng" options={STATUS_OPTIONS} required />
      {status !== '410' && (
        <TextField
          name="toPath"
          control={form.control}
          label="Đường dẫn mới"
          required
          placeholder="/san-pham/slug-moi hoặc https://…"
        />
      )}
      <Textarea label="Ghi chú" rows={2} error={form.formState.errors.note?.message} {...note} />
      <SwitchField
        name="isActive"
        control={form.control}
        label="Đang bật"
        description="Tắt để giữ lại dòng nhưng không chuyển hướng nữa."
      />
    </div>
  );
}
