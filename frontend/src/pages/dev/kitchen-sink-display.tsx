/**
 * Kitchen sink — display primitives. TEMPORARY (removed at the W3 gate).
 */
import { Plus, Trash2, Star, Download } from 'lucide-react';
import {
  Button,
  IconButton,
  Badge,
  StatusBadge,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter,
  Avatar,
  Img,
  Price,
  Money,
  StatCard,
  Breadcrumb,
  SafeHtml,
} from '../../components/ui';

const Row = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-6">
    <p className="mb-2 text-xs font-medium uppercase tracking-[.02em] text-fg-subtle">{title}</p>
    <div className="flex flex-wrap items-center gap-3">{children}</div>
  </div>
);

export const KitchenSinkDisplay = () => (
  <section>
    <Row title="Button — variants">
      <Button variant="primary">Mua ngay</Button>
      <Button variant="ink">Xem chi tiết</Button>
      <Button variant="outline">Huỷ</Button>
      <Button variant="ghost">Bỏ qua</Button>
      <Button variant="dashed" icon={Plus}>Thêm dòng</Button>
      <Button variant="danger" icon={Trash2}>Xoá</Button>
    </Row>

    <Row title="Button — sizes / states">
      <Button size="sm">Nhỏ</Button>
      <Button size="md">Vừa</Button>
      <Button size="lg">Lớn</Button>
      <Button loading>Đang lưu</Button>
      <Button disabled>Không khả dụng</Button>
      <Button icon={Download} iconPosition="right">Xuất Excel</Button>
    </Row>

    <Row title="IconButton — aria-label is required by the type">
      <IconButton aria-label="Thêm mới" variant="primary"><Plus size={18} /></IconButton>
      <IconButton aria-label="Xoá" variant="danger"><Trash2 size={18} /></IconButton>
      <IconButton aria-label="Đánh giá" variant="outline"><Star size={18} /></IconButton>
      <IconButton aria-label="Tải xuống" size="sm"><Download size={16} /></IconButton>
    </Row>

    <Row title="Badge / StatusBadge">
      <Badge variant="neutral">Nháp</Badge>
      <Badge variant="brand">Bán chạy</Badge>
      <Badge variant="discount">-24%</Badge>
      <Badge variant="ink">Mới</Badge>
      <StatusBadge tone="success">Hoàn tất</StatusBadge>
      <StatusBadge tone="warning">Chờ xử lý</StatusBadge>
      <StatusBadge tone="danger">Đã huỷ</StatusBadge>
      <StatusBadge tone="info">Đang giao</StatusBadge>
      <StatusBadge tone="violet">Bảo hành</StatusBadge>
    </Row>

    <Row title="Price / Money — tabular-nums, VAT-inclusive (D01)">
      <Price value={27599000} compareAt={31990000} />
      <Price value={580000} />
      <Price value={null} />
      <Price value={1290000} tone="admin" />
      <Money value={2145852} />
    </Row>

    <Row title="Avatar">
      <Avatar name="Trần Quang Hưởng" size="lg" />
      <Avatar name="Nguyễn Văn Bình" size="md" />
      <Avatar name="Lê Thị Hoa" size="sm" />
      <Avatar name="Ảnh hỏng" src="/media/khong-ton-tai.webp" size="md" />
    </Row>

    <Row title="Breadcrumb">
      <Breadcrumb
        items={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Laptop', to: '/danh-muc/laptop' },
          { label: 'Laptop gaming' },
        ]}
      />
    </Row>

    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Doanh thu hôm nay" value={48250000} delta={{ value: 12.4, label: 'so với hôm qua' }} animate />
      <StatCard label="Đơn hàng" value={37} delta={{ value: -3.2, label: 'so với hôm qua' }} />
      <StatCard label="Khách mới" value={8} delta={{ value: 0, label: 'không đổi' }} />
      <StatCard label="Tồn kho cảnh báo" value={null} hint="Không tải được — đây phải là “—”, không phải 0" />
    </div>

    <div className="mb-6 grid gap-4 md:grid-cols-2">
      <Card interactive>
        <CardHeader>
          <CardTitle>Card có header/footer</CardTitle>
          <Badge variant="info">Ví dụ</Badge>
        </CardHeader>
        <CardBody>
          <Img src="/media/seed/products/khong-co.webp" alt="Ảnh sản phẩm mẫu" ratio="16/9" fit="cover" wrapperClassName="rounded-md" />
          <p className="mt-3 text-sm text-fg-muted">
            Ảnh ở trên cố tình sai đường dẫn để thấy placeholder của <code>Img</code>.
          </p>
        </CardBody>
        <CardFooter>
          <Button variant="ghost" size="sm">Huỷ</Button>
          <Button size="sm">Lưu</Button>
        </CardFooter>
      </Card>

      <Card padded>
        <CardTitle>SafeHtml (DOMPurify)</CardTitle>
        <SafeHtml
          className="mt-2"
          html={
            '<h3>Mô tả sản phẩm</h3><p>Nội dung <strong>từ CMS</strong> đã được lọc.</p>' +
            '<ul><li>Bảo hành 24 tháng</li><li>Giao nhanh 2h</li></ul>' +
            '<script>alert("xss")</script><img src="x" onerror="alert(1)">' +
            '<a href="javascript:alert(1)">liên kết độc hại</a>'
          }
        />
        <p className="mt-2 text-xs text-fg-subtle">
          Thẻ <code>script</code>, thuộc tính <code>onerror</code> và link <code>javascript:</code> ở trên đã bị loại bỏ.
        </p>
      </Card>
    </div>
  </section>
);

export default KitchenSinkDisplay;
