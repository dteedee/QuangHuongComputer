import { useEffect, useState } from 'react';
import type { ConditionType, PromotionCondition } from '../../api/promotions';
import { catalogApi } from '../../api/catalog';

// ---------------------------------------------------------------------------
// Meta + helpers dùng chung cho các editor điều kiện
// ---------------------------------------------------------------------------
export interface ConditionMeta {
  type: ConditionType;
  label: string;
  description: string;
}

export const CONDITION_META: ConditionMeta[] = [
  { type: 'MinOrderValue', label: 'Giá trị đơn tối thiểu', description: 'Đơn hàng phải đạt mức tối thiểu' },
  { type: 'Category', label: 'Danh mục sản phẩm', description: 'Áp dụng với danh mục cụ thể' },
  { type: 'Brand', label: 'Thương hiệu', description: 'Áp dụng với thương hiệu cụ thể' },
  { type: 'Product', label: 'Sản phẩm', description: 'Áp dụng với sản phẩm chỉ định' },
  { type: 'CustomerGroup', label: 'Nhóm khách hàng', description: 'Personal / Student / Business' },
  { type: 'TimeOfDay', label: 'Khung giờ', description: 'Chỉ áp trong khoảng giờ trong ngày' },
  { type: 'DayOfWeek', label: 'Ngày trong tuần', description: 'Chỉ áp vào ngày được chọn' },
  { type: 'FirstOrder', label: 'Đơn hàng đầu tiên', description: 'Chỉ áp cho đơn đầu tiên của khách' },
  { type: 'Quantity', label: 'Số lượng tối thiểu', description: 'Tổng SL sản phẩm trong giỏ' },
];

type UpdateFn = (patch: Partial<PromotionCondition>) => void;

interface EditorProps {
  condition: PromotionCondition;
  update: UpdateFn;
}

const parseJson = <T,>(json: string, fallback: T): T => {
  try {
    return json ? (JSON.parse(json) as T) : fallback;
  } catch {
    return fallback;
  }
};

// ---------------------------------------------------------------------------
// Editors từng loại — mỗi editor sinh valueJson + operator phù hợp
// ---------------------------------------------------------------------------
function MinOrderValueEditor({ condition, update }: EditorProps) {
  const value = parseJson<{ amount: number }>(condition.valueJson, { amount: 0 });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label className="text-sm font-medium text-gray-700">
        Giá trị tối thiểu (đ)
        <input
          type="number"
          value={value.amount || ''}
          onChange={(e) => update({ operator: 'Gte', valueJson: JSON.stringify({ amount: Number(e.target.value) || 0 }) })}
          min={0}
          className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-accent"
          placeholder="VD: 500000"
        />
      </label>
    </div>
  );
}

function IdMultiSelectEditor({
  condition,
  update,
  loader,
  placeholder,
}: EditorProps & {
  loader: () => Promise<{ id: string; name: string }[]>;
  placeholder: string;
}) {
  const value = parseJson<{ ids: string[] }>(condition.valueJson, { ids: [] });
  const [options, setOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loader()
      .then((data) => {
        if (!cancelled) setOptions(data);
      })
      .catch(() => { /* silent — options rỗng */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loader]);

  const toggle = (id: string) => {
    const next = value.ids.includes(id) ? value.ids.filter((x) => x !== id) : [...value.ids, id];
    update({ operator: 'In', valueJson: JSON.stringify({ ids: next }) });
  };

  if (loading) return <p className="text-xs text-gray-500">Đang tải...</p>;
  if (options.length === 0) return <p className="text-xs text-gray-500">Không có dữ liệu ({placeholder})</p>;

  return (
    <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
      {options.map((opt) => (
        <label key={opt.id} className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 px-2 py-1 rounded cursor-pointer">
          <input
            type="checkbox"
            checked={value.ids.includes(opt.id)}
            onChange={() => toggle(opt.id)}
            className="rounded text-accent"
          />
          <span>{opt.name}</span>
        </label>
      ))}
    </div>
  );
}

function CustomerGroupEditor({ condition, update }: EditorProps) {
  const value = parseJson<{ group: string }>(condition.valueJson, { group: 'Personal' });
  return (
    <select
      value={value.group}
      onChange={(e) => update({ operator: 'Eq', valueJson: JSON.stringify({ group: e.target.value }) })}
      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-accent"
    >
      <option value="Personal">Cá nhân</option>
      <option value="Student">Học sinh - Sinh viên</option>
      <option value="Business">Doanh nghiệp</option>
    </select>
  );
}

function TimeOfDayEditor({ condition, update }: EditorProps) {
  const value = parseJson<{ from: string; to: string }>(condition.valueJson, { from: '00:00', to: '23:59' });
  const change = (field: 'from' | 'to', v: string) => {
    update({ operator: 'Between', valueJson: JSON.stringify({ ...value, [field]: v }) });
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="text-sm font-medium text-gray-700">
        Từ
        <input type="time" value={value.from} onChange={(e) => change('from', e.target.value)}
          className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-accent" />
      </label>
      <label className="text-sm font-medium text-gray-700">
        Đến
        <input type="time" value={value.to} onChange={(e) => change('to', e.target.value)}
          className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-accent" />
      </label>
      <p className="col-span-2 text-xs text-gray-500">
        Nếu "Đến" nhỏ hơn "Từ" — coi như khung giờ vượt qua nửa đêm.
      </p>
    </div>
  );
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function DayOfWeekEditor({ condition, update }: EditorProps) {
  const value = parseJson<{ days: number[] }>(condition.valueJson, { days: [] });
  const toggle = (d: number) => {
    const next = value.days.includes(d) ? value.days.filter((x) => x !== d) : [...value.days, d];
    update({ operator: 'In', valueJson: JSON.stringify({ days: next.sort() }) });
  };
  return (
    <div className="flex flex-wrap gap-2">
      {WEEKDAYS.map((label, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => toggle(idx)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            value.days.includes(idx)
              ? 'bg-accent text-white border-accent'
              : 'bg-white text-gray-700 border-gray-200 hover:border-accent'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function FirstOrderEditor({ condition, update }: EditorProps) {
  const value = parseJson<{ enabled: boolean }>(condition.valueJson, { enabled: true });
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={value.enabled}
        onChange={(e) => update({ operator: 'Eq', valueJson: JSON.stringify({ enabled: e.target.checked }) })}
        className="rounded text-accent"
      />
      Chỉ áp cho đơn đầu tiên của khách
    </label>
  );
}

function QuantityEditor({ condition, update }: EditorProps) {
  const value = parseJson<{ min: number }>(condition.valueJson, { min: 1 });
  return (
    <label className="text-sm font-medium text-gray-700">
      Số lượng tối thiểu
      <input
        type="number"
        min={1}
        value={value.min || 1}
        onChange={(e) => update({ operator: 'Gte', valueJson: JSON.stringify({ min: Number(e.target.value) || 1 }) })}
        className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-accent"
      />
    </label>
  );
}

// ---------------------------------------------------------------------------
// Loaders (memoized để tránh re-fetch)
// ---------------------------------------------------------------------------
const loadCategories = async () => (await catalogApi.getCategories()).map((c) => ({ id: c.id, name: c.name }));
const loadBrands = async () => (await catalogApi.getBrands()).map((b) => ({ id: b.id, name: b.name }));
const loadProducts = async () => {
  const res = await catalogApi.getProducts({ page: 1, pageSize: 100 });
  return res.products.map((p) => ({ id: p.id, name: p.name }));
};

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------
export function ConditionEditor(props: EditorProps) {
  switch (props.condition.type) {
    case 'MinOrderValue': return <MinOrderValueEditor {...props} />;
    case 'Category': return <IdMultiSelectEditor {...props} loader={loadCategories} placeholder="danh mục" />;
    case 'Brand': return <IdMultiSelectEditor {...props} loader={loadBrands} placeholder="thương hiệu" />;
    case 'Product': return <IdMultiSelectEditor {...props} loader={loadProducts} placeholder="sản phẩm" />;
    case 'CustomerGroup': return <CustomerGroupEditor {...props} />;
    case 'TimeOfDay': return <TimeOfDayEditor {...props} />;
    case 'DayOfWeek': return <DayOfWeekEditor {...props} />;
    case 'FirstOrder': return <FirstOrderEditor {...props} />;
    case 'Quantity': return <QuantityEditor {...props} />;
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Preview text — hiển thị tóm tắt điều kiện
// ---------------------------------------------------------------------------
export function describeCondition(c: PromotionCondition): string {
  const v = parseJson<Record<string, unknown>>(c.valueJson, {});
  switch (c.type) {
    case 'MinOrderValue':
      return `Đơn hàng ≥ ${(Number(v.amount) || 0).toLocaleString('vi-VN')}đ`;
    case 'Category': {
      const count = Array.isArray(v.ids) ? v.ids.length : 0;
      return count ? `Thuộc ${count} danh mục` : 'Danh mục (chưa chọn)';
    }
    case 'Brand': {
      const count = Array.isArray(v.ids) ? v.ids.length : 0;
      return count ? `Thuộc ${count} thương hiệu` : 'Thương hiệu (chưa chọn)';
    }
    case 'Product': {
      const count = Array.isArray(v.ids) ? v.ids.length : 0;
      return count ? `${count} sản phẩm chỉ định` : 'Sản phẩm (chưa chọn)';
    }
    case 'CustomerGroup':
      return `Nhóm khách: ${v.group ?? '—'}`;
    case 'TimeOfDay':
      return `Từ ${v.from ?? '00:00'} đến ${v.to ?? '23:59'}`;
    case 'DayOfWeek': {
      const days = Array.isArray(v.days) ? (v.days as number[]) : [];
      return days.length ? `Ngày: ${days.map((d) => WEEKDAYS[d]).join(', ')}` : 'Ngày trong tuần';
    }
    case 'FirstOrder':
      return v.enabled ? 'Chỉ đơn đầu tiên' : 'Không giới hạn đơn đầu';
    case 'Quantity':
      return `Số lượng ≥ ${v.min ?? 1}`;
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Default valueJson khi thêm mới một điều kiện
// ---------------------------------------------------------------------------
export function defaultCondition(type: ConditionType): PromotionCondition {
  switch (type) {
    case 'MinOrderValue': return { type, operator: 'Gte', valueJson: JSON.stringify({ amount: 0 }) };
    case 'Category':
    case 'Brand':
    case 'Product': return { type, operator: 'In', valueJson: JSON.stringify({ ids: [] }) };
    case 'CustomerGroup': return { type, operator: 'Eq', valueJson: JSON.stringify({ group: 'Personal' }) };
    case 'TimeOfDay': return { type, operator: 'Between', valueJson: JSON.stringify({ from: '00:00', to: '23:59' }) };
    case 'DayOfWeek': return { type, operator: 'In', valueJson: JSON.stringify({ days: [] }) };
    case 'FirstOrder': return { type, operator: 'Eq', valueJson: JSON.stringify({ enabled: true }) };
    case 'Quantity': return { type, operator: 'Gte', valueJson: JSON.stringify({ min: 1 }) };
  }
}
