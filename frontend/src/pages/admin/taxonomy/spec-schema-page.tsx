import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ListChecks, Plus } from 'lucide-react';
import { Button, PageHeader, QueryBoundary, SkeletonText, notify } from '../../../components/ui';
import { Can } from '../../../components/Can';
import { useConfirm } from '../../../context/ConfirmContext';
import { PERMISSIONS } from '../../../constants/permissions';
import { catalogAdminApi } from '../../../api/catalog/admin';
import { catalogPublicListingApi } from '../../../api/catalog/public-listing';
import { queryKeys } from '../../../lib/query-keys';
import { SpecAttributeDialog, SpecGroupDialog } from './spec-schema-dialogs';
import { SpecGroupCard } from './spec-group-card';
import type { SpecificationAttribute, SpecificationGroup } from '../../../api/catalog/types';

/** Quản lý lược đồ thông số kỹ thuật: nhóm + thuộc tính (catalog.md §8). */
export function SpecSchemaPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [groupDialog, setGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SpecificationGroup | null>(null);
  const [attrDialog, setAttrDialog] = useState<{ group: SpecificationGroup; attr: SpecificationAttribute | null } | null>(null);

  const query = useQuery({
    queryKey: queryKeys.catalog.list({ resource: 'spec-groups' }),
    queryFn: catalogAdminApi.specSchema.listGroups,
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.list({ resource: 'categories' }),
    queryFn: catalogPublicListingApi.getCategories,
  });

  const categories = useMemo(
    () => (categoriesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [categoriesQuery.data],
  );
  const categoryName = (id?: string | null) =>
    categories.find((c) => c.value === id)?.label ?? 'Mọi ngành hàng';

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });

  const run = async (label: string, work: () => Promise<unknown>) => {
    try { await work(); refresh(); notify.success(label); }
    catch (error) { notify.error('Thao tác thất bại', { description: (error as Error).message }); }
  };

  const groups = useMemo(
    () => [...(query.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [query.data],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Thông số kỹ thuật"
        description="Nhóm và thuộc tính dùng chung cho toàn bộ sản phẩm — nguồn của bộ lọc và bảng so sánh."
        actions={
          <Can permission={PERMISSIONS.CATALOG_MANAGE}>
            <Button variant="primary" onClick={() => { setEditingGroup(null); setGroupDialog(true); }}>
              <Plus size={16} /> Thêm nhóm
            </Button>
          </Can>
        }
      />

      <QueryBoundary
        query={query}
        skeleton={<SkeletonText lines={10} />}
        isEmpty={(g) => g.length === 0}
        errorTitle="Không tải được lược đồ thông số"
        empty={{
          icon: ListChecks,
          title: 'Chưa có nhóm thông số nào',
          description: 'Tạo nhóm (ví dụ “Laptop - Bộ xử lý”) rồi thêm các thuộc tính bên trong.',
          action: { label: 'Thêm nhóm', onClick: () => { setEditingGroup(null); setGroupDialog(true); } },
        }}
      >
        {() => (
          <div className="grid gap-4">
            {groups.map((group) => (
              <SpecGroupCard
                key={group.id}
                group={group}
                categoryLabel={categoryName(group.categoryId)}
                onAddAttribute={() => setAttrDialog({ group, attr: null })}
                onEditGroup={() => { setEditingGroup(group); setGroupDialog(true); }}
                onDeleteGroup={async () => {
                  const ok = await confirm({
                    title: 'Xoá nhóm thông số?',
                    message: `"${group.name}" chỉ xoá được khi không còn thuộc tính nào bên trong.`,
                    confirmText: 'Xoá nhóm',
                  });
                  if (ok) await run('Đã xoá nhóm', () => catalogAdminApi.specSchema.deleteGroup(group.id));
                }}
                onEditAttribute={(attr) => setAttrDialog({ group, attr })}
                onDeleteAttribute={async (attr) => {
                  const ok = await confirm({
                    title: 'Xoá thuộc tính?',
                    message: `"${attr.name}" chỉ xoá được khi chưa sản phẩm nào nhập giá trị cho nó.`,
                    confirmText: 'Xoá thuộc tính',
                  });
                  if (ok) await run('Đã xoá thuộc tính', () => catalogAdminApi.specSchema.deleteAttribute(attr.id));
                }}
              />
            ))}
          </div>
        )}
      </QueryBoundary>

      <SpecGroupDialog
        open={groupDialog}
        onOpenChange={setGroupDialog}
        editing={editingGroup}
        categories={categories}
        nextSortOrder={groups.length}
        onSubmit={async (values) => {
          const dto = { name: values.name, categoryId: values.categoryId || null, sortOrder: values.sortOrder };
          await run(editingGroup ? 'Đã lưu nhóm' : 'Đã thêm nhóm', () =>
            editingGroup
              ? catalogAdminApi.specSchema.updateGroup(editingGroup.id, dto)
              : catalogAdminApi.specSchema.createGroup(dto));
        }}
      />

      {attrDialog && (
        <SpecAttributeDialog
          open
          onOpenChange={(open) => { if (!open) setAttrDialog(null); }}
          editing={attrDialog.attr}
          groupName={attrDialog.group.name}
          nextSortOrder={attrDialog.group.attributes.length}
          onSubmit={async (values) => {
            const dto = {
              name: values.name,
              dataType: values.dataType,
              unit: values.unit || null,
              enumValuesJson: values.enumValuesJson || null,
              isFilterable: values.isFilterable,
              isComparable: values.isComparable,
              sortOrder: values.sortOrder,
            };
            await run(attrDialog.attr ? 'Đã lưu thuộc tính' : 'Đã thêm thuộc tính', () =>
              attrDialog.attr
                ? catalogAdminApi.specSchema.updateAttribute(attrDialog.attr.id, dto)
                : catalogAdminApi.specSchema.createAttribute(attrDialog.group.id, { ...dto, key: values.key }));
          }}
        />
      )}
    </div>
  );
}

export default SpecSchemaPage;
