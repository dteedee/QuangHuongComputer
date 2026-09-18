import { CrudFormDialog, NumberField, SelectField, SwitchField, TextField } from '../../../components/form';
import {
  specAttributeSchema, specGroupSchema,
  type SpecAttributeFormValues, type SpecGroupFormValues,
} from './taxonomy-schemas';
import type { SpecificationAttribute, SpecificationGroup } from '../../../api/catalog/types';

const DATA_TYPES = [
  { value: 'Text', label: 'Chữ' },
  { value: 'Number', label: 'Số' },
  { value: 'Boolean', label: 'Có / Không' },
  { value: 'Enum', label: 'Danh sách chọn' },
];

interface GroupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SpecificationGroup | null;
  categories: Array<{ value: string; label: string }>;
  nextSortOrder: number;
  onSubmit: (values: SpecGroupFormValues) => Promise<void>;
}

/** Thêm/sửa NHÓM thông số (catalog.md §8). */
export function SpecGroupDialog({ open, onOpenChange, editing, categories, nextSortOrder, onSubmit }: GroupProps) {
  return (
    <CrudFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? `Sửa nhóm: ${editing.name}` : 'Thêm nhóm thông số'}
      schema={specGroupSchema}
      defaultValues={{
        name: editing?.name ?? '',
        categoryId: editing?.categoryId ?? '',
        sortOrder: editing?.sortOrder ?? nextSortOrder,
      } as never}
      knownFields={['name', 'categoryId', 'sortOrder']}
      onSubmit={async (values) => { await onSubmit(values); onOpenChange(false); }}
    >
      {(form) => (
        <div className="grid gap-4">
          <TextField name="name" control={form.control} label="Tên nhóm" required placeholder="VD: Laptop - Bộ xử lý" />
          <SelectField
            name="categoryId"
            control={form.control}
            label="Áp dụng cho ngành hàng"
            options={[{ value: '', label: '— Mọi ngành hàng —' }, ...categories]}
          />
          <NumberField name="sortOrder" control={form.control} label="Thứ tự" min={0} />
        </div>
      )}
    </CrudFormDialog>
  );
}

interface AttributeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SpecificationAttribute | null;
  groupName: string;
  nextSortOrder: number;
  onSubmit: (values: SpecAttributeFormValues) => Promise<void>;
}

/** Thêm/sửa THUỘC TÍNH. `key` bất biến sau khi tạo (backend từ chối đổi). */
export function SpecAttributeDialog({
  open, onOpenChange, editing, groupName, nextSortOrder, onSubmit,
}: AttributeProps) {
  return (
    <CrudFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? `Sửa thuộc tính: ${editing.name}` : `Thêm thuộc tính vào "${groupName}"`}
      schema={specAttributeSchema}
      defaultValues={{
        key: editing?.key ?? '',
        name: editing?.name ?? '',
        dataType: editing?.dataType ?? 'Text',
        unit: editing?.unit ?? '',
        enumValuesJson: '',
        isFilterable: editing?.isFilterable ?? false,
        isComparable: editing?.isComparable ?? true,
        sortOrder: editing?.sortOrder ?? nextSortOrder,
      } as never}
      knownFields={['key', 'name', 'dataType', 'unit', 'sortOrder']}
      onSubmit={async (values) => { await onSubmit(values); onOpenChange(false); }}
    >
      {(form) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="key"
            control={form.control}
            label="Mã thuộc tính"
            required
            disabled={Boolean(editing)}
            placeholder="cpu_model"
            hint={editing ? 'Mã không đổi được sau khi tạo.' : 'Chữ thường, số và dấu gạch dưới.'}
          />
          <TextField name="name" control={form.control} label="Tên hiển thị" required placeholder="CPU" />
          <SelectField
            name="dataType"
            control={form.control}
            label="Kiểu dữ liệu"
            required
            options={DATA_TYPES}
            disabled={Boolean(editing)}
          />
          <TextField name="unit" control={form.control} label="Đơn vị" placeholder="GB, GHz, inch…" />
          <NumberField name="sortOrder" control={form.control} label="Thứ tự" min={0} />
          <div className="sm:col-span-2 space-y-3 rounded-xl border border-line bg-sunken p-4">
            <SwitchField
              name="isFilterable"
              control={form.control}
              label="Cho phép lọc"
              description="Xuất hiện trong bộ lọc của trang danh mục."
            />
            <SwitchField
              name="isComparable"
              control={form.control}
              label="Cho phép so sánh"
              description="Xuất hiện trong bảng so sánh sản phẩm."
            />
          </div>
          {editing && (
            <p className="sm:col-span-2 text-xs text-fg-subtle">
              Kiểu dữ liệu chỉ đổi được khi chưa có sản phẩm nào nhập giá trị cho thuộc tính này —
              máy chủ sẽ trả lỗi 409 nếu đã có.
            </p>
          )}
        </div>
      )}
    </CrudFormDialog>
  );
}
