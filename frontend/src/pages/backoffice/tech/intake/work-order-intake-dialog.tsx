import { useQuery } from '@tanstack/react-query';
import { CrudFormDialog, SelectField, TextField } from '../../../../components/form';
import { Textarea } from '../../../../components/ui';
import { queryKeys } from '../../../../lib/query-keys';
import { repairServiceTypesApi } from '../../../../api/repair/service-types';
import { WORK_ORDER_PRIORITIES, WORK_ORDER_PRIORITY_LABELS } from '../../../../api/repair/work-order-priority';
import { intakeFormSchema, type IntakeFormValues } from './work-order-intake-schema';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaults: IntakeFormValues;
    onSubmit: (values: IntakeFormValues) => Promise<void>;
}

const PRIORITY_OPTIONS = WORK_ORDER_PRIORITIES.map((p) => ({ value: p, label: WORK_ORDER_PRIORITY_LABELS[p] }));

/** Edit intake details: priority, device, serial, accessories left with the shop, catalog service. */
export function WorkOrderIntakeDialog({ open, onOpenChange, defaults, onSubmit }: Props) {
    const services = useQuery({ queryKey: [...queryKeys.repair.all, 'service-types', 'active'], queryFn: repairServiceTypesApi.listActive, enabled: open });
    const serviceOptions = [{ value: '', label: 'Chưa chọn' }, ...(services.data ?? []).map((s) => ({ value: s.id, label: s.name }))];

    return (
        <CrudFormDialog<IntakeFormValues>
            open={open}
            onOpenChange={onOpenChange}
            title="Thông tin tiếp nhận máy"
            schema={intakeFormSchema}
            defaultValues={defaults}
            knownFields={['priority', 'deviceType', 'deviceBrand', 'deviceModel', 'serialNumber', 'serviceTypeId']}
            onSubmit={async (values) => { await onSubmit(values); onOpenChange(false); }}
        >
            {(form) => (
                <div className="grid gap-3 sm:grid-cols-2">
                    <SelectField name="priority" control={form.control} label="Mức ưu tiên" options={PRIORITY_OPTIONS} required />
                    <SelectField name="serviceTypeId" control={form.control} label="Dịch vụ" options={serviceOptions} />
                    <TextField name="deviceType" control={form.control} label="Loại thiết bị" placeholder="Laptop, PC, máy in…" />
                    <TextField name="deviceBrand" control={form.control} label="Hãng" placeholder="Dell, Asus…" />
                    <TextField name="deviceModel" control={form.control} label="Model" />
                    <TextField name="serialNumber" control={form.control} label="Số serial" />
                    <div className="sm:col-span-2">
                        <Textarea label="Phụ kiện nhận kèm (mỗi dòng một món)" rows={3}
                            {...form.register('accessoriesText')} error={form.formState.errors.accessoriesText?.message} />
                    </div>
                </div>
            )}
        </CrudFormDialog>
    );
}
