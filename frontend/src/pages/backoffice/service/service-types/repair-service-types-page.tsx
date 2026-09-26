import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Wrench } from 'lucide-react';
import { Button, Card, CardBody, DataTable, PageHeader, notify } from '../../../../components/ui';
import { useConfirm } from '../../../../context/ConfirmContext';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../constants/permissions';
import { queryKeys } from '../../../../lib/query-keys';
import { normalizeApiError } from '../../../../lib/api-error';
import { repairServiceTypesApi, type RepairServiceType, type RepairServiceTypeWriteDto } from '../../../../api/repair/service-types';
import { buildServiceTypeColumns } from './repair-service-type-columns';
import { RepairServiceTypeFormDialog } from './repair-service-type-form-dialog';

/**
 * Danh mục dịch vụ sửa chữa: tên, mã, giá gốc (điền sẵn dòng báo giá), thời gian ước tính, tận
 * nơi hay tại cửa hàng, bật/tắt. Xem: Repair.ViewAll; sửa: Repair.ManageServiceTypes.
 */
export default function RepairServiceTypesPage() {
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const { hasPermission } = usePermissions();
    const canManage = hasPermission(PERMISSIONS.REPAIR_MANAGE_SERVICE_TYPES);
    const [editing, setEditing] = useState<RepairServiceType | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const key = [...queryKeys.repair.lists(), 'service-types'];
    const query = useQuery({ queryKey: key, queryFn: repairServiceTypesApi.listAll });
    const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.repair.all });

    const save = useMutation({
        mutationFn: (dto: RepairServiceTypeWriteDto) => (editing ? repairServiceTypesApi.update(editing.id, dto) : repairServiceTypesApi.create(dto)),
        onSuccess: () => { void refresh(); notify.success(editing ? 'Đã lưu dịch vụ' : 'Đã thêm dịch vụ'); },
    });

    const openCreate = () => { setEditing(null); setDialogOpen(true); };
    const columns = buildServiceTypeColumns({
        canManage,
        onEdit: (r) => { setEditing(r); setDialogOpen(true); },
        onDelete: async (r) => {
            const ok = await confirm({
                title: 'Xoá dịch vụ?',
                message: `"${r.name}" sẽ bị xoá khỏi danh mục. Dịch vụ đã có lịch hẹn/báo giá thì không xoá được — hãy tắt thay vì xoá.`,
                confirmText: 'Xoá',
            });
            if (!ok) return;
            try { await repairServiceTypesApi.remove(r.id); void refresh(); notify.success('Đã xoá dịch vụ'); }
            catch (e) { notify.error('Không xoá được dịch vụ', { description: normalizeApiError(e).message }); }
        },
    });

    return (
        <div className="space-y-4">
            <PageHeader
                title="Dịch vụ sửa chữa"
                description="Bảng giá dịch vụ khách chọn khi đặt lịch; giá gốc điền sẵn một dòng báo giá."
                actions={canManage && <Button size="sm" icon={Plus} onClick={openCreate}>Thêm dịch vụ</Button>}
            />
            <Card padded>
                <CardBody>
                    <DataTable
                        caption="Danh mục dịch vụ sửa chữa"
                        columns={columns}
                        rows={query.data}
                        rowKey={(r) => r.id}
                        loading={query.isPending}
                        error={query.error}
                        onRetry={() => query.refetch()}
                        enableColumnVisibility
                        empty={{
                            icon: Wrench,
                            title: 'Chưa có dịch vụ nào',
                            description: 'Thêm các dịch vụ cửa hàng nhận: vệ sinh, cài đặt, thay màn hình…',
                            ...(canManage ? { action: { label: 'Thêm dịch vụ', onClick: openCreate } } : {}),
                        }}
                    />
                </CardBody>
            </Card>
            <RepairServiceTypeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing}
                onSubmit={async (dto) => { await save.mutateAsync(dto); }} />
        </div>
    );
}
