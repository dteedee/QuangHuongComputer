import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderTree, Plus, Search } from 'lucide-react';
import {
  Button, Card, CardBody, Input, PageHeader, QueryBoundary, SkeletonText, notify,
} from '../../../components/ui';
import { Can } from '../../../components/Can';
import { useConfirm } from '../../../context/ConfirmContext';
import { PERMISSIONS } from '../../../constants/permissions';
import { catalogAdminApi } from '../../../api/catalog/admin';
import { catalogPublicListingApi } from '../../../api/catalog/public-listing';
import { queryKeys } from '../../../lib/query-keys';
import { CategoryFormDialog } from './category-form-dialog';
import { CategoryTreeRow } from './category-tree-row';
import { buildCategoryTree, type CategoryNode } from './category-tree-model';
import type { Category, CategoryWriteDto } from '../../../api/catalog/types';

const toDto = (c: Category): CategoryWriteDto => ({
  name: c.name,
  description: c.description ?? '',
  parentId: c.parentId ?? null,
  clearParent: !c.parentId,
  imageUrl: c.imageUrl ?? null,
  icon: c.icon ?? null,
  displayOrder: c.displayOrder ?? 0,
  metaTitle: c.metaTitle ?? null,
  metaDescription: c.metaDescription ?? null,
  vatRate: c.vatRate ?? null,
  vatReductionEligible: c.vatReductionEligible ?? false,
  isSerialTracked: c.isSerialTracked ?? false,
});

/** Cây ngành hàng: cấp cha/con, ảnh, slug, SEO, VAT (D01) và cờ sê-ri (D08). */
export function CategoryTreePage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const query = useQuery({
    queryKey: queryKeys.catalog.list({ resource: 'categories' }),
    queryFn: catalogPublicListingApi.getCategories,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });

  const save = useMutation({
    mutationFn: async (dto: CategoryWriteDto) => {
      if (editing) await catalogAdminApi.updateCategory(editing.id, dto);
      else await catalogAdminApi.createCategory(dto);
    },
    onSuccess: () => {
      refresh();
      notify.success(editing ? 'Đã lưu ngành hàng' : 'Đã thêm ngành hàng');
    },
  });

  const mutate = async (label: string, work: () => Promise<unknown>) => {
    try {
      await work();
      refresh();
      notify.success(label);
    } catch (error) {
      notify.error('Thao tác thất bại', { description: (error as Error).message });
    }
  };

  const tree = useMemo(() => buildCategoryTree(query.data ?? []), [query.data]);
  const parentOptions = useMemo(
    () => (query.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [query.data],
  );

  const term = search.trim().toLowerCase();
  const visible = useMemo(() => {
    const out: Array<{ node: CategoryNode; siblings: CategoryNode[]; index: number }> = [];
    const walk = (nodes: CategoryNode[]) => {
      nodes.forEach((node, index) => {
        const match = !term || node.name.toLowerCase().includes(term) || (node.slug ?? '').includes(term);
        if (match) out.push({ node, siblings: nodes, index });
        if (term || !collapsed[node.id]) walk(node.children);
      });
    };
    walk(tree);
    return out;
  }, [tree, collapsed, term]);

  const move = (node: Category, direction: -1 | 1) => {
    const entry = visible.find((v) => v.node.id === node.id);
    if (!entry) return;
    const target = entry.siblings[entry.index + direction];
    if (!target) return;
    void mutate('Đã đổi thứ tự', () =>
      Promise.all([
        catalogAdminApi.updateCategory(node.id, { ...toDto(node), displayOrder: target.displayOrder ?? 0 }),
        catalogAdminApi.updateCategory(target.id, { ...toDto(target), displayOrder: node.displayOrder ?? 0 }),
      ]));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ngành hàng"
        description="Cây phân loại sản phẩm, thuế suất VAT và quy tắc quản lý sê-ri."
        actions={
          <Can permission={PERMISSIONS.CATALOG_CREATE}>
            <Button variant="primary" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus size={16} /> Thêm ngành hàng
            </Button>
          </Can>
        }
      />

      <Card padded>
        <CardBody className="space-y-4">
          <Input
            label="Tìm ngành hàng"
            icon={Search}
            placeholder="Tên hoặc đường dẫn"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <QueryBoundary
            query={query}
            skeleton={<SkeletonText lines={8} />}
            isEmpty={() => visible.length === 0}
            errorTitle="Không tải được danh sách ngành hàng"
            empty={{
              icon: FolderTree,
              title: term ? 'Không có ngành hàng nào khớp' : 'Chưa có ngành hàng nào',
              description: term ? 'Thử từ khoá khác.' : 'Tạo ngành hàng đầu tiên để phân loại sản phẩm.',
              action: { label: 'Thêm ngành hàng', onClick: () => { setEditing(null); setDialogOpen(true); } },
            }}
          >
            {() => (
              <ul className="rounded-xl border border-line">
                {visible.map(({ node, siblings, index }) => (
                  <CategoryTreeRow
                    key={node.id}
                    node={node}
                    expanded={!collapsed[node.id]}
                    onToggleExpand={() => setCollapsed((p) => ({ ...p, [node.id]: !p[node.id] }))}
                    onEdit={(c) => { setEditing(c); setDialogOpen(true); }}
                    onToggleActive={(c) =>
                      void mutate(c.isActive ? 'Đã ẩn ngành hàng' : 'Đã hiện ngành hàng', () =>
                        c.isActive ? catalogAdminApi.deleteCategory(c.id) : catalogAdminApi.activateCategory(c.id))}
                    onDelete={async (c) => {
                      const ok = await confirm({
                        title: 'Ẩn ngành hàng?',
                        message: `"${c.name}" sẽ được ẩn khỏi cửa hàng. Nếu vẫn còn sản phẩm đang hoạt động, máy chủ sẽ từ chối.`,
                        confirmText: 'Ẩn ngành hàng',
                      });
                      if (ok) await mutate('Đã ẩn ngành hàng', () => catalogAdminApi.deleteCategory(c.id));
                    }}
                    onMove={move}
                    canMoveUp={index > 0}
                    canMoveDown={index < siblings.length - 1}
                  />
                ))}
              </ul>
            )}
          </QueryBoundary>
        </CardBody>
      </Card>

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        parentOptions={parentOptions}
        onSubmit={async (dto) => { await save.mutateAsync(dto); }}
      />
    </div>
  );
}

export default CategoryTreePage;
