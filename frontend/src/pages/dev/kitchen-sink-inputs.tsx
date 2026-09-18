/**
 * Kitchen sink — input primitives. TEMPORARY (removed at the W3 gate).
 * The prop contract shown here is the one W1-9's `FormField` wraps.
 */
import { useState } from 'react';
import { Mail, Search } from 'lucide-react';
import {
  Input,
  Textarea,
  Select,
  Combobox,
  AsyncSearchableSelect,
  Checkbox,
  Radio,
  RadioGroup,
  Switch,
} from '../../components/ui';

const PROVINCES = [
  { value: 'hn', label: 'Hà Nội' },
  { value: 'hcm', label: 'TP. Hồ Chí Minh' },
  { value: 'dn', label: 'Đà Nẵng' },
  { value: 'hp', label: 'Hải Phòng' },
  { value: 'ct', label: 'Cần Thơ' },
  { value: 'bd', label: 'Bình Dương' },
];

export const KitchenSinkInputs = () => {
  const [province, setProvince] = useState('hn');
  const [combo, setCombo] = useState('');
  const [agree, setAgree] = useState(false);
  const [partial, setPartial] = useState(true);
  const [ship, setShip] = useState('standard');
  const [notify, setNotify] = useState(true);

  return (
    <section className="grid gap-5 md:grid-cols-2">
      <div className="space-y-4">
        <Input label="Họ và tên" placeholder="Nguyễn Văn A" />
        <Input label="Email" icon={Mail} type="email" placeholder="ban@quanghuong.vn" hint="Dùng để nhận hoá đơn điện tử." />
        <Input label="Tìm kiếm" icon={Search} placeholder="Tên hoặc mã sản phẩm" />
        <Input label="Số điện thoại" defaultValue="090" error="Số điện thoại phải có 10 chữ số." />
        <Input label="Cân nặng" suffix="kg" inputSize="sm" placeholder="0" />
        <Input label="Không khả dụng" disabled placeholder="Chỉ đọc" />
      </div>

      <div className="space-y-4">
        <Textarea label="Ghi chú đơn hàng" placeholder="Giao giờ hành chính…" hint="Tối đa 500 ký tự." />
        <Select
          label="Tỉnh / Thành phố"
          options={PROVINCES}
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          placeholder="Chọn tỉnh/thành"
        />
        <div>
          <p className="mb-1.5 text-13 font-medium text-fg">Combobox (tìm kiếm trong danh sách)</p>
          <Combobox options={PROVINCES} value={combo} onChange={setCombo} placeholder="Gõ để lọc…" />
        </div>
        <div>
          <p className="mb-1.5 text-13 font-medium text-fg">AsyncSearchableSelect (tải theo trang)</p>
          <AsyncSearchableSelect
            loadOptions={async (q, page) => ({
              options: PROVINCES.filter((p) => p.label.toLowerCase().includes(q.toLowerCase())).map((p) => ({
                ...p,
                value: `${p.value}-${page}`,
              })),
              hasMore: page < 2,
            })}
            placeholder="Tải từ máy chủ…"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Checkbox label="Tôi đồng ý với điều khoản dịch vụ" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <Checkbox label="Chọn một phần (indeterminate)" indeterminate={partial} checked={false} onChange={() => setPartial((v) => !v)} />
        <Checkbox label="Không khả dụng" disabled />
      </div>

      <div className="space-y-4">
        <RadioGroup legend="Hình thức giao hàng">
          <Radio name="ship" value="standard" label="Tiêu chuẩn" description="2–4 ngày, miễn phí từ 500.000₫" checked={ship === 'standard'} onChange={() => setShip('standard')} />
          <Radio name="ship" value="fast" label="Hoả tốc 2h" description="Nội thành, phụ thu 40.000₫" checked={ship === 'fast'} onChange={() => setShip('fast')} />
          <Radio name="ship" value="pickup" label="Nhận tại cửa hàng" checked={ship === 'pickup'} onChange={() => setShip('pickup')} />
        </RadioGroup>

        <Switch
          checked={notify}
          onCheckedChange={setNotify}
          label="Nhận thông báo khuyến mãi"
          description="Chỉ gửi tối đa 2 email mỗi tháng."
        />
        <Switch checked={false} onCheckedChange={() => {}} aria-label="Công tắc nhỏ" size="sm" disabled />
      </div>
    </section>
  );
};

export default KitchenSinkInputs;
