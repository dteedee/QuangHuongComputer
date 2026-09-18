import { Link } from 'react-router-dom';
import type { UseFormReturn } from 'react-hook-form';
import { Card, CardBody, CardHeader, CardTitle, StatusBadge } from '../../../../components/ui';
import { NumberField, TextField } from '../../../../components/form';
import { paths } from '../../../../routes';
import type { Product } from '../../../../api/catalog/types';
import type { ProductEditorValues } from '../product-editor-schema';

interface Props {
  form: UseFormReturn<ProductEditorValues>;
  /** `undefined` khi đang tạo mới — lúc đó tồn kho ban đầu mới được nhập tay. */
  product?: Product;
}

const stockTone = (p: Product) =>
  p.stockQuantity <= 0 ? 'danger' : p.stockQuantity <= (p.lowStockThreshold ?? 0) ? 'warning' : 'success';

const stockLabel = (p: Product) =>
  p.stockQuantity <= 0 ? 'Hết hàng' : p.stockQuantity <= (p.lowStockThreshold ?? 0) ? 'Sắp hết' : 'Còn hàng';

/**
 * Tab "Kho & vận chuyển". Với sản phẩm đã tồn tại, tồn kho là số liệu của
 * module Kho — sửa ở đây sẽ đá nhau với phiếu nhập/xuất, nên chỉ đọc kèm lối
 * tắt sang phiếu điều chỉnh.
 */
export function ProductInventorySection({ form, product }: Props) {
  return (
    <Card padded>
      <CardHeader>
        <CardTitle>Kho &amp; vận chuyển</CardTitle>
      </CardHeader>
      <CardBody className="grid gap-4 sm:grid-cols-2">
        {product ? (
          <div className="rounded-xl bg-sunken p-4">
            <p className="text-xs text-fg-muted">Tồn kho hiện tại</p>
            <p className="num mt-1 text-xl font-semibold">
              {product.stockQuantity.toLocaleString('vi-VN')} {product.unitName || 'Chiếc'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge tone={stockTone(product)}>{stockLabel(product)}</StatusBadge>
              <Link
                to={paths.backoffice.inventoryCount()}
                className="text-xs font-medium text-brand-text underline-offset-2 hover:underline"
              >
                Phiếu kiểm kê / điều chỉnh
              </Link>
            </div>
          </div>
        ) : (
          <NumberField
            name="stockQuantity"
            control={form.control}
            label="Tồn kho ban đầu"
            required
            min={0}
            hint="Sau khi tạo, tồn kho do phiếu nhập/xuất của module Kho quyết định."
          />
        )}
        <NumberField
          name="lowStockThreshold"
          control={form.control}
          label="Ngưỡng cảnh báo sắp hết"
          min={0}
          hint="Dưới ngưỡng này sản phẩm hiện trong báo cáo sắp hết hàng."
        />
        <TextField name="barcode" control={form.control} label="Mã vạch" placeholder="EAN-13 / UPC" />
        <NumberField
          name="weight"
          control={form.control}
          label="Khối lượng (kg)"
          min={0}
          step={0.01}
          hint="Dùng để tính phí vận chuyển."
        />
      </CardBody>
    </Card>
  );
}
