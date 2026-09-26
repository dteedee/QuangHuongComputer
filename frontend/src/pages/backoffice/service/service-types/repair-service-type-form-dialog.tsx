import { CrudFormDialog, MoneyField, NumberField, SwitchField, TextField } from '../../../../components/form';
import { Textarea } from '../../../../components/ui';
import type { RepairServiceType, RepairServiceTypeWriteDto } from '../../../../api/repair/service-types';
import { serviceTypeFormSchema, toServiceTypeDto, toServiceTypeFormValues, type ServiceTypeFormValues } from './repair-service-type-schema';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: RepairServiceType | null;
    onSubmit: (dto: RepairServiceTypeWriteDto) => Promise<void>;
}

/** Add / edit one catalog service. Duplicate codes are rejected by the server and shown on the field. */
export function RepairServiceTypeFormDialog({ open, onOpenChange, editing, onSubmit }: Props) {
    return (
        <CrudFormDialog<ServiceTypeFormValues>
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? 'Sửa dịch vụ sửa chữa' : 'Thêm dịch vụ sửa chữa'}
            description="Giá gốc đã gồm VAT, dùng để điền sẵn dòng báo giá — kỹ thuật viên vẫn sửa được."
            schema={serviceTypeFormSchema}
            defaultValues={toServiceTypeFormValues(editing)}
            knownFields={['code', 'name', 'description', 'basePrice', 'estimatedMinutes', 'sortOrder']}
            onSubmit={async (values) => { await onSubmit(toServiceTypeDto(values)); onOpenChange(false); }}
        >
            {(form) => (
                <div className="grid gap-3 sm:grid-cols-2">
                    <TextField name="code" control={form.control} label="Mã" required placeholder="VE_SINH_LAPTOP" />
                    <TextField name="name" control={form.control} label="Tên dịch vụ" required />
                    <MoneyField name="basePrice" control={form.control} label="Giá gốc" currencyLabel="₫" required />
                    <NumberField name="estimatedMinutes" control={form.control} label="Thời gian ước tính (phút)" min={0} step={15} required />
                    <NumberField name="sortOrder" control={form.control} label="Thứ tự hiển thị" step={10} required />
                    <div className="sm:col-span-2">
                        <Textarea label="Mô tả" rows={3} {...form.register('description')} error={form.formState.errors.description?.message} />
                    </div>
                    <SwitchField name="isOnSite" control={form.control} label="Làm tận nơi"
                        description="Bật: khách phải nhập địa chỉ, cộng phí tận nơi theo cấu hình." />
                    <SwitchField name="isActive" control={form.control} label="Đang nhận"
                        description="Tắt để ẩn khỏi form đặt lịch nhưng giữ lịch sử." />
                </div>
            )}
        </CrudFormDialog>
    );
}
