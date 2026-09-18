import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorState, Skeleton, notify } from '../../../components/ui';
import { Form, applyServerErrors } from '../../../components/form';
import { catalogAdminApi } from '../../../api/catalog/admin';
import { catalogPublicListingApi } from '../../../api/catalog/public-listing';
import { queryKeys } from '../../../lib/query-keys';
import { paths } from '../../../routes';
import { ProductEditorBody } from './product-editor-body';
import {
  PRODUCT_EDITOR_FIELDS, emptyProductValues, productEditorSchema, productToFormValues,
  toCreateDto, toPostCreateDto, toUpdateDto, type ProductEditorValues,
} from './product-editor-schema';

const EditorSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-10 w-72" />
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  </div>
);

/** Trình sửa sản phẩm — một route riêng, MỘT form state cho mọi tab. */
export function ProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('basic');

  const productQuery = useQuery({
    queryKey: queryKeys.catalog.detail(id ?? 'new'),
    queryFn: () => catalogAdminApi.getProductForEdit(id!),
    enabled: !isNew,
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.list({ resource: 'categories' }),
    queryFn: catalogPublicListingApi.getCategories,
  });
  const brandsQuery = useQuery({
    queryKey: queryKeys.catalog.list({ resource: 'brands' }),
    queryFn: catalogPublicListingApi.getBrands,
  });

  const product = productQuery.data;
  const categories = useMemo(
    () => (categoriesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [categoriesQuery.data],
  );
  const brands = useMemo(
    () => (brandsQuery.data ?? []).map((b) => ({ value: b.id, label: b.name })),
    [brandsQuery.data],
  );

  const defaultValues = useMemo<ProductEditorValues>(
    () => (product ? productToFormValues(product) : emptyProductValues()),
    [product],
  );

  const statusMutation = useMutation({
    mutationFn: async (action: 'publish' | 'unpublish' | 'toggle') => {
      if (action === 'publish') return catalogAdminApi.publishProduct(id!);
      if (action === 'unpublish') return catalogAdminApi.unpublishProduct(id!);
      return catalogAdminApi.toggleProductStatus(id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
      notify.success('Đã cập nhật trạng thái sản phẩm');
    },
    onError: (error) => notify.error('Không đổi được trạng thái', { description: String((error as Error).message ?? '') }),
  });

  if (!isNew && productQuery.isPending) return <EditorSkeleton />;
  if (!isNew && productQuery.isError) {
    return (
      <ErrorState
        title="Không tải được sản phẩm"
        error={productQuery.error}
        onRetry={() => productQuery.refetch()}
      />
    );
  }

  const hasImage = Boolean(product?.imageUrl) || (product?.medias?.length ?? 0) > 0;

  return (
    <Form
      key={product?.id ?? 'new'}
      schema={productEditorSchema}
      defaultValues={defaultValues as never}
      className="space-y-4 pb-24"
      onSubmit={async (values, form) => {
        try {
          if (isNew) {
            const created = await catalogAdminApi.createProduct(toCreateDto(values));
            // `CreateProductDto` không có ngưỡng tồn / slug / SEO — gửi tiếp một
            // lệnh cập nhật để tab Kho và tab SEO không mất dữ liệu khi tạo mới.
            const rest = toPostCreateDto(values);
            if (Object.keys(rest).length > 0) {
              await catalogAdminApi.updateProduct(created.id, rest);
            }
            queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
            notify.success('Đã tạo sản phẩm', { description: 'Thêm ảnh rồi bấm "Hiện trên web" để đăng bán.' });
            navigate(paths.backoffice.productEdit(created.id), { replace: true });
            return;
          }
          const dto = toUpdateDto(values, form.formState.dirtyFields as Record<string, unknown>);
          if (Object.keys(dto).length === 0) {
            notify.info('Không có thay đổi nào để lưu');
            return;
          }
          const { product: updated } = await catalogAdminApi.updateProduct(id!, dto);
          queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
          form.reset(productToFormValues(updated));
          notify.success('Đã lưu sản phẩm');
        } catch (error) {
          const applied = applyServerErrors(form.setError, error, PRODUCT_EDITOR_FIELDS);
          if (applied.length > 0) form.setFocus(applied[0]);
        }
      }}
    >
      {(form) => (
        <ProductEditorBody
          form={form}
          product={product}
          isNew={isNew}
          categories={categories}
          brands={brands}
          tab={tab}
          onTabChange={setTab}
          hasImage={hasImage}
          statusBusy={statusMutation.isPending}
          onStatus={(action) => statusMutation.mutate(action)}
          onMediaChanged={() => queryClient.invalidateQueries({ queryKey: queryKeys.catalog.detail(id ?? '') })}
          onBack={() => navigate(paths.backoffice.products())}
        />
      )}
    </Form>
  );
}

export default ProductEditorPage;
