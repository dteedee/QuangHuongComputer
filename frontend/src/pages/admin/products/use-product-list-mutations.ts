/**
 * Mọi thao tác ghi của danh sách sản phẩm: sửa, nhân bản, đăng/gỡ web, ẩn,
 * thao tác hàng loạt và xuất Excel.
 *
 * Tách khỏi `product-list-page.tsx` để file đó dưới 200 dòng (CLAUDE.md).
 * KHÔNG đổi endpoint, tham số truy vấn hay luồng nghiệp vụ — chỉ đổi chỗ ở.
 */
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '../../../components/ui';
import { useConfirm, usePrompt } from '../../../context/ConfirmContext';
import { catalogAdminApi } from '../../../api/catalog/admin';
import { queryKeys } from '../../../lib/query-keys';
import { paths } from '../../../routes';
import type { Product } from '../../../api/catalog/types';

export interface ProductListMutationsArgs {
  categories: Array<{ value: string; label: string }>;
  /** Bộ lọc hiện hành — quyết định phạm vi tệp Excel khi không chọn dòng nào. */
  filters: { categoryId?: string; brandId?: string };
  selectedIds: string[];
}

export function useProductListMutations({ categories, filters, selectedIds }: ProductListMutationsArgs) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { promptSelect } = usePrompt();

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });

  const run = async (label: string, work: () => Promise<unknown>) => {
    try {
      await work();
      await refresh();
      notify.success(label);
    } catch (error) {
      notify.error('Thao tác thất bại', { description: (error as Error).message });
    }
  };

  /** Hành động trên MỘT dòng. */
  const handlers = {
    onEdit: (p: Product) => navigate(paths.backoffice.productEdit(p.id)),
    onDuplicate: (p: Product) =>
      run('Đã nhân bản sản phẩm', async () => {
        const copy = await catalogAdminApi.createProduct({
          name: `${p.name} (bản sao)`,
          description: p.description ?? '',
          price: p.price,
          costPrice: p.costPrice ?? 0,
          categoryId: p.categoryId,
          brandId: p.brandId,
          stockQuantity: 0,
          warrantyInfo: p.warrantyInfo,
          warrantyMonths: p.warrantyMonths ?? undefined,
          isReturnExcluded: p.isReturnExcluded,
          unitName: p.unitName ?? undefined,
        });
        navigate(paths.backoffice.productEdit(copy.id));
      }),
    onTogglePublish: (p: Product) =>
      run(p.publishedAt ? 'Đã gỡ khỏi web' : 'Đã hiện trên web', () =>
        p.publishedAt ? catalogAdminApi.unpublishProduct(p.id) : catalogAdminApi.publishProduct(p.id)),
    onHide: async (p: Product) => {
      const ok = await confirm({
        title: 'Ẩn sản phẩm?',
        message: `"${p.name}" sẽ ngừng kinh doanh và biến mất khỏi mọi kênh bán. Có thể mở bán lại bất cứ lúc nào.`,
        confirmText: 'Ẩn sản phẩm',
      });
      if (ok) await run('Đã ẩn sản phẩm', () => catalogAdminApi.deleteProduct(p.id));
    },
  };

  /** Hành động hàng loạt trên các dòng đã chọn. */
  const bulk = {
    activate: (ids: string[]) =>
      run(`Đã mở bán ${ids.length} sản phẩm`, () =>
        Promise.all(ids.map((i) => catalogAdminApi.activateProduct(i)))),
    changeCategory: async (ids: string[]) => {
      const categoryId = await promptSelect({
        title: 'Chuyển ngành hàng',
        message: `Áp dụng cho ${ids.length} sản phẩm đã chọn.`,
        options: categories,
      });
      if (!categoryId) return;
      await run('Đã chuyển ngành hàng', () =>
        Promise.all(ids.map((i) => catalogAdminApi.updateProduct(i, { categoryId }))));
    },
    hide: async (ids: string[]) => {
      const ok = await confirm({
        title: `Ẩn ${ids.length} sản phẩm?`,
        message: 'Các sản phẩm này sẽ ngừng kinh doanh trên mọi kênh. Có thể mở bán lại sau.',
        confirmText: 'Ẩn sản phẩm',
      });
      if (ok) await run(`Đã ẩn ${ids.length} sản phẩm`, () =>
        Promise.all(ids.map((i) => catalogAdminApi.deleteProduct(i))));
    },
  };

  const exportXlsx = () =>
    run('Đã tải tệp Excel', async () => {
      const blob = await catalogAdminApi.exportProducts({
        categoryId: filters.categoryId || undefined,
        brandId: filters.brandId || undefined,
        ids: selectedIds.length > 0 ? selectedIds.join(',') : undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `san-pham-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    });

  return { handlers, bulk, exportXlsx };
}
