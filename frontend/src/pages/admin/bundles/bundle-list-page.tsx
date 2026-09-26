import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Boxes, Plus } from 'lucide-react';
import { Button, Card, CardBody, DataTable, PageHeader, notify } from '../../../components/ui';
import { useConfirm } from '../../../context/ConfirmContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';
import { paths } from '../../../routes';
import { queryKeys } from '../../../lib/query-keys';
import { normalizeApiError } from '../../../lib/api-error';
import { bundleAdminApi } from '../../../api/bundle';
import { buildBundleColumns } from './bundle-list-columns';

/** Combo sản phẩm ("Combo tiết kiệm") — danh sách + bật/tắt nhanh. */
export function BundleListPage() {
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const canManage = hasPermission(PERMISSIONS.CATALOG_EDIT);

    const query = useQuery({
        queryKey: queryKeys.catalog.list({ resource: 'bundles' }),
        queryFn: bundleAdminApi.list,
    });
    const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });

    const run = async (label: string, work: () => Promise<unknown>) => {
        try { await work(); refresh(); notify.success(label); }
        catch (error) { notify.error('Thao tác thất bại', { description: normalizeApiError(error).message }); }
    };

    const create = () => navigate(paths.backoffice.bundleNew());
    const columns = buildBundleColumns({
        canManage,
        onEdit: (b) => navigate(paths.backoffice.bundleEdit(b.id)),
        onToggle: (b, on) => void run(on ? 'Đã bật combo' : 'Đã tắt combo', () => bundleAdminApi.setActive(b.id, on)),
        onDelete: async (b) => {
            const ok = await confirm({
                title: 'Xoá combo?',
                message: `Combo "${b.name}" sẽ bị xoá. Giỏ hàng đang chứa combo này sẽ trở về giá lẻ.`,
                confirmText: 'Xoá',
            });
            if (ok) await run('Đã xoá combo', () => bundleAdminApi.remove(b.id));
        },
    });

    return (
        <div className="space-y-4">
            <PageHeader
                title="Combo sản phẩm"
                description="Combo tiết kiệm hiển thị trên trang sản phẩm; giá combo tính lại từ giá lẻ hiện hành."
                actions={hasPermission(PERMISSIONS.CATALOG_CREATE)
                    ? <Button size="sm" icon={Plus} onClick={create}>Tạo combo</Button>
                    : undefined}
            />
            <Card padded>
                <CardBody>
                    <DataTable
                        caption="Danh sách combo sản phẩm"
                        columns={columns}
                        rows={query.data}
                        rowKey={(b) => b.id}
                        loading={query.isPending}
                        error={query.error}
                        onRetry={() => query.refetch()}
                        empty={{
                            icon: Boxes,
                            title: 'Chưa có combo nào',
                            description: 'Gom các sản phẩm hay mua cùng nhau thành combo có giá tốt hơn.',
                            action: { label: 'Tạo combo', onClick: create },
                        }}
                    />
                </CardBody>
            </Card>
        </div>
    );
}

export default BundleListPage;
