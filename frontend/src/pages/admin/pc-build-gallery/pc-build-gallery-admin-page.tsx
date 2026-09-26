import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Cpu, Plus } from 'lucide-react';
import { Button, Card, CardBody, DataTable, PageHeader, notify } from '../../../components/ui';
import { useConfirm } from '../../../context/ConfirmContext';
import { normalizeApiError } from '../../../lib/api-error';
import { pcBuildGalleryAdminApi, type PcGalleryBuild } from '../../../api/pcbuilder-gallery';
import { buildGalleryColumns } from './pc-build-gallery-columns';
import { EditGalleryDialog, PromoteGalleryDialog } from './pc-build-gallery-dialogs';
import type { GalleryEditValues } from './pc-build-gallery-schema';

const QUERY_KEY = ['pcbuilder', 'admin', 'gallery'] as const;

const toUpdate = (b: PcGalleryBuild): GalleryEditValues => ({
    title: b.title, useCaseTag: b.useCaseTag as GalleryEditValues['useCaseTag'],
    sortOrder: b.sortOrder, isFeatured: b.isFeatured, isPublic: b.isPublic,
});

/** Back office — "Cấu hình mẫu" (/cau-hinh-mau): tuyển chọn từ build đã lưu, bật công khai/nổi bật. */
export function PcBuildGalleryAdminPage() {
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const [promoteOpen, setPromoteOpen] = useState(false);
    const [editing, setEditing] = useState<PcGalleryBuild | null>(null);

    const query = useQuery({ queryKey: QUERY_KEY, queryFn: pcBuildGalleryAdminApi.list });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['pcbuilder'] });

    const run = async (label: string, work: () => Promise<unknown>) => {
        try { await work(); await refresh(); notify.success(label); }
        catch (error) { notify.error('Thao tác thất bại', { description: normalizeApiError(error).message }); }
    };

    const columns = buildGalleryColumns({
        onEdit: setEditing,
        onToggle: (b, field, value) => void run('Đã cập nhật cấu hình mẫu',
            () => pcBuildGalleryAdminApi.update(b.id, { ...toUpdate(b), [field]: value })),
        onDelete: async (b) => {
            const ok = await confirm({
                title: 'Gỡ cấu hình mẫu?',
                message: `"${b.title}" sẽ biến mất khỏi trang cấu hình mẫu. Cấu hình gốc của khách không bị ảnh hưởng.`,
                confirmText: 'Gỡ',
            });
            if (ok) await run('Đã gỡ cấu hình mẫu', () => pcBuildGalleryAdminApi.remove(b.id));
        },
    });

    return (
        <div className="space-y-4">
            <PageHeader
                title="Cấu hình mẫu"
                description="Chọn cấu hình đã lưu để hiện trên /cau-hinh-mau; giá và tương thích tính lại theo dữ liệu hiện hành."
                actions={<Button size="sm" icon={Plus} onClick={() => setPromoteOpen(true)}>Thêm từ cấu hình đã lưu</Button>}
            />
            <Card padded>
                <CardBody>
                    <DataTable
                        caption="Danh sách cấu hình mẫu"
                        columns={columns}
                        rows={query.data}
                        rowKey={(b) => b.id}
                        loading={query.isPending}
                        error={query.error}
                        onRetry={() => query.refetch()}
                        empty={{
                            icon: Cpu,
                            title: 'Chưa có cấu hình mẫu',
                            description: 'Lưu một cấu hình ở trang Xây dựng cấu hình rồi thêm vào đây bằng mã chia sẻ.',
                            action: { label: 'Thêm từ cấu hình đã lưu', onClick: () => setPromoteOpen(true) },
                        }}
                    />
                </CardBody>
            </Card>

            <PromoteGalleryDialog
                open={promoteOpen}
                onOpenChange={setPromoteOpen}
                onSubmit={async (values) => {
                    await pcBuildGalleryAdminApi.promote(values);
                    setPromoteOpen(false);
                    await refresh();
                    notify.success('Đã thêm cấu hình mẫu');
                }}
            />
            <EditGalleryDialog
                build={editing}
                onClose={() => setEditing(null)}
                onSubmit={async (build, values) => {
                    await pcBuildGalleryAdminApi.update(build.id, values);
                    setEditing(null);
                    await refresh();
                    notify.success('Đã lưu cấu hình mẫu');
                }}
            />
        </div>
    );
}

export default PcBuildGalleryAdminPage;
