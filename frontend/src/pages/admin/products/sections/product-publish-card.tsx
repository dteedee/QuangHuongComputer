import { Globe, EyeOff, Power } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, CardTitle, StatusBadge } from '../../../../components/ui';
import { Can } from '../../../../components/Can';
import { PERMISSIONS } from '../../../../constants/permissions';
import type { Product } from '../../../../api/catalog/types';
import { formatDateTime } from '../admin-formatting';

interface Props {
  product: Product;
  hasImage: boolean;
  busy: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onToggleActive: () => void;
}

/**
 * Cột phải của trình sửa: hai trạng thái ĐỘC LẬP theo D10.
 * - "Ngừng kinh doanh" (`isActive=false`) gỡ khỏi MỌI kênh, kể cả POS.
 * - "Chưa đăng web" (`publishedAt=null`) chỉ ẩn khỏi cửa hàng trực tuyến,
 *   sản phẩm vẫn bán được tại quầy và vẫn lên báo giá.
 */
export function ProductPublishCard({
  product, hasImage, busy, onPublish, onUnpublish, onToggleActive,
}: Props) {
  const published = Boolean(product.publishedAt);
  return (
    <Card padded>
      <CardHeader>
        <CardTitle>Trạng thái</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-13 text-fg-muted">Kinh doanh</span>
            <StatusBadge tone={product.isActive ? 'success' : 'neutral'}>
              {product.isActive ? 'Đang kinh doanh' : 'Ngừng kinh doanh'}
            </StatusBadge>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-13 text-fg-muted">Cửa hàng trực tuyến</span>
            <StatusBadge tone={published ? 'success' : 'warning'}>
              {published ? 'Đang hiện trên web' : 'Chưa đăng web'}
            </StatusBadge>
          </div>
          {published && (
            <p className="text-xs text-fg-subtle">Đăng lúc {formatDateTime(product.publishedAt)}</p>
          )}
        </div>

        <Can permission={PERMISSIONS.CATALOG_EDIT}>
          <div className="space-y-2">
            {published ? (
              <Button type="button" variant="outline" size="sm" className="w-full" loading={busy} onClick={onUnpublish}>
                <EyeOff size={15} /> Gỡ khỏi web
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="w-full"
                  loading={busy}
                  disabled={!hasImage}
                  onClick={onPublish}
                >
                  <Globe size={15} /> Hiện trên web
                </Button>
                {!hasImage && (
                  <p className="text-xs text-warning-text">
                    Cần ít nhất một ảnh sản phẩm trước khi đăng lên web.
                  </p>
                )}
              </>
            )}
            <Button type="button" variant={product.isActive ? 'outline' : 'primary'} size="sm" className="w-full" loading={busy} onClick={onToggleActive}>
              <Power size={15} /> {product.isActive ? 'Ngừng kinh doanh' : 'Mở bán lại'}
            </Button>
          </div>
        </Can>

        <dl className="space-y-1.5 border-t border-line pt-3 text-xs text-fg-muted">
          <div className="flex justify-between"><dt>Lượt xem</dt><dd className="num">{product.viewCount ?? 0}</dd></div>
          <div className="flex justify-between"><dt>Đã bán</dt><dd className="num">{product.soldCount ?? 0}</dd></div>
          <div className="flex justify-between"><dt>Đánh giá</dt><dd className="num">{(product.averageRating ?? 0).toFixed(1)} ({product.reviewCount ?? 0})</dd></div>
          <div className="flex justify-between"><dt>Tạo lúc</dt><dd className="num">{formatDateTime(product.createdAt)}</dd></div>
        </dl>
      </CardBody>
    </Card>
  );
}
