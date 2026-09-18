/**
 * Kitchen sink — overlays. TEMPORARY (removed at the W3 gate).
 * Keyboard checklist for this section: Tab into each trigger, Enter/Space to
 * open, Tab cycles inside the dialog only, Escape closes, focus returns.
 */
import { useState } from 'react';
import { Info, Filter } from 'lucide-react';
import {
  Button,
  IconButton,
  Dialog,
  ConfirmDialog,
  Drawer,
  Popover,
  Tooltip,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Input,
  notify,
} from '../../components/ui';

export const KitchenSinkOverlays = () => {
  const [dialog, setDialog] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [drawerRight, setDrawerRight] = useState(false);
  const [drawerLeft, setDrawerLeft] = useState(false);
  const [tab, setTab] = useState('all');

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setDialog(true)}>Mở Dialog</Button>
        <Button variant="danger" onClick={() => setConfirm(true)}>Mở ConfirmDialog</Button>
        <Button variant="outline" onClick={() => setDrawerRight(true)}>Drawer phải (giỏ hàng)</Button>
        <Button variant="outline" onClick={() => setDrawerLeft(true)}>Drawer trái (menu)</Button>

        <Popover
          label="Bộ lọc"
          trigger={({ toggle, ...aria }) => (
            <Button variant="outline" icon={Filter} onClick={toggle} {...aria}>
              Popover
            </Button>
          )}
        >
          {(close) => (
            <div className="space-y-2 p-1">
              <Input inputSize="sm" placeholder="Từ khoá" />
              <Button size="sm" block onClick={close}>Áp dụng</Button>
            </div>
          )}
        </Popover>

        <Tooltip content="Gợi ý ngắn, không chứa thông tin bắt buộc">
          <IconButton aria-label="Thông tin"><Info size={18} /></IconButton>
        </Tooltip>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => notify.success('Đã lưu thay đổi')}>Toast thành công</Button>
        <Button variant="outline" size="sm" onClick={() => notify.error('Không lưu được', { description: 'Máy chủ trả về lỗi 500.' })}>Toast lỗi</Button>
        <Button variant="outline" size="sm" onClick={() => notify.warning('Sắp hết hàng')}>Toast cảnh báo</Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => notify.info('Đã xoá 3 dòng', { onUndo: () => notify.success('Đã hoàn tác') })}
        >
          Toast có Hoàn tác
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabList aria-label="Trạng thái đơn hàng">
          <Tab value="all" count={137}>Tất cả</Tab>
          <Tab value="new" count={12}>Chờ xác nhận</Tab>
          <Tab value="shipping" count={5}>Đang giao</Tab>
          <Tab value="done" count={118}>Hoàn tất</Tab>
        </TabList>
        <TabPanel value="all"><p className="text-sm text-fg-muted">Tất cả đơn hàng.</p></TabPanel>
        <TabPanel value="new"><p className="text-sm text-fg-muted">Đơn chờ xác nhận.</p></TabPanel>
        <TabPanel value="shipping"><p className="text-sm text-fg-muted">Đơn đang giao.</p></TabPanel>
        <TabPanel value="done"><p className="text-sm text-fg-muted">Đơn đã hoàn tất.</p></TabPanel>
      </Tabs>

      <Dialog
        open={dialog}
        onOpenChange={setDialog}
        title="Cập nhật thông tin giao hàng"
        description="Thay đổi sẽ áp dụng cho đơn hàng này."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDialog(false)}>Huỷ</Button>
            <Button size="sm" onClick={() => setDialog(false)}>Lưu</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Người nhận" defaultValue="Nguyễn Văn A" />
          <Input label="Số điện thoại" defaultValue="0901234567" />
          <p className="text-sm text-fg-muted">
            Tab bị khoá trong hộp thoại này; Escape đóng; nền không cuộn được.
          </p>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Xoá 3 sản phẩm đã chọn?"
        description="Hành động này không thể hoàn tác."
        onConfirm={() => {
          setConfirm(false);
          notify.success('Đã xoá 3 sản phẩm');
        }}
      />

      <Drawer open={drawerRight} onOpenChange={setDrawerRight} title="Giỏ hàng" footer={<Button block>Thanh toán</Button>}>
        <p className="text-sm text-fg-muted">Nội dung giỏ hàng.</p>
      </Drawer>

      <Drawer open={drawerLeft} onOpenChange={setDrawerLeft} side="left" title="Danh mục">
        <p className="text-sm text-fg-muted">Menu điều hướng.</p>
      </Drawer>
    </section>
  );
};

export default KitchenSinkOverlays;
