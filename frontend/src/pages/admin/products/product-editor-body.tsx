/**
 * Thân trình sửa sản phẩm — tách khỏi `product-editor-page.tsx` để mỗi file
 * dưới 200 dòng và để hook dirty-guard chạy BÊN TRONG `<Form>` (nó cần
 * `form` đã dựng xong).
 */
import { ArrowLeft, ExternalLink, Save } from 'lucide-react';
import { Button, Card, CardBody, PageHeader } from '../../../components/ui';
import { useUnsavedChangesGuard } from '../../../components/form';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import { buildPath, ROUTES } from '../../../routes';
import { ProductEditorTabs } from './product-editor-tabs';
import { ProductPublishCard } from './sections/product-publish-card';

export type BodyProps = {
  form: Parameters<typeof ProductEditorTabs>[0]['form'];
  product?: Parameters<typeof ProductEditorTabs>[0]['product'];
  isNew: boolean;
  categories: Array<{ value: string; label: string }>;
  brands: Array<{ value: string; label: string }>;
  tab: string;
  onTabChange: (t: string) => void;
  hasImage: boolean;
  statusBusy: boolean;
  onStatus: (action: 'publish' | 'unpublish' | 'toggle') => void;
  onMediaChanged: () => void;
  onBack: () => void;
};

/** Tách thân ra để hook dirty-guard chạy BÊN TRONG `<Form>` (cần `form` đã dựng). */
export function ProductEditorBody({
  form, product, isNew, categories, brands, tab, onTabChange,
  hasImage, statusBusy, onStatus, onMediaChanged, onBack,
}: BodyProps) {
  const { isDirty, isSubmitting } = form.formState;
  const { guardedClose } = useUnsavedChangesGuard({ isDirty });

  return (
    <>
      <PageHeader
        title={isNew ? 'Thêm sản phẩm' : (product?.name ?? 'Sửa sản phẩm')}
        description={isNew ? 'Điền thông tin rồi lưu — mọi tab dùng chung một biểu mẫu.' : `SKU ${product?.sku || '—'}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => guardedClose(onBack)}>
              <ArrowLeft size={16} /> Danh sách
            </Button>
            {product?.slug && (
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(buildPath(ROUTES.PRODUCT_DETAIL, product.slug!), '_blank', 'noopener')}
              >
                <ExternalLink size={16} /> Xem trên web
              </Button>
            )}
            <Can permission={isNew ? PERMISSIONS.CATALOG_CREATE : PERMISSIONS.CATALOG_EDIT}>
              <Button type="submit" variant="primary" loading={isSubmitting} disabled={!isNew && !isDirty}>
                <Save size={16} /> {isNew ? 'Tạo sản phẩm' : 'Lưu thay đổi'}
              </Button>
            </Can>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <ProductEditorTabs
            form={form}
            product={product}
            categories={categories}
            brands={brands}
            tab={tab}
            onTabChange={onTabChange}
            onMediaChanged={onMediaChanged}
          />
        </div>
        <aside className="space-y-4">
          {product ? (
            <ProductPublishCard
              product={product}
              hasImage={hasImage}
              busy={statusBusy}
              onPublish={() => onStatus('publish')}
              onUnpublish={() => onStatus('unpublish')}
              onToggleActive={() => onStatus('toggle')}
            />
          ) : (
            <Card padded>
              <CardBody className="text-13 text-fg-muted">
                Sản phẩm mới được tạo ở trạng thái <strong>chưa đăng web</strong>. Sau khi lưu, hãy thêm
                ít nhất một ảnh rồi bấm “Hiện trên web”.
              </CardBody>
            </Card>
          )}
        </aside>
      </div>

      {isDirty && (
        <div className="fixed inset-x-0 bottom-0 z-floating border-t border-line bg-surface/95 px-4 py-3 backdrop-blur xl:left-[264px]">
          <div className="mx-auto flex max-w-admin items-center justify-between gap-3">
            <p className="text-13 text-fg-muted">Có thay đổi chưa lưu.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => form.reset()}>
                Hoàn tác
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={isSubmitting}>
                <Save size={15} /> Lưu thay đổi
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

