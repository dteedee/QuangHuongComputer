import { useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  promotionsApi,
  type CreatePromotionDto,
  type Promotion,
  type PromotionCondition,
  type PromotionReward,
} from '../../api/promotions';
import { PromotionBuilder } from './promotion-builder';
import { PromotionPreview } from './promotion-preview';

interface PromotionWizardProps {
  initial?: Promotion | null;
  defaultType?: 'Code' | 'Automatic' | 'FlashSale';
  onClose: () => void;
  onSaved: () => void;
}

const nowLocal = () => new Date().toISOString().slice(0, 16);
const plusDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 16);

function normaliseIso(dt: string): string {
  return dt ? new Date(dt).toISOString() : new Date().toISOString();
}

function buildInitialForm(initial: Promotion | null | undefined, defaultType: PromotionWizardProps['defaultType']): CreatePromotionDto & { conditions: PromotionCondition[]; rewards: PromotionReward[] } {
  if (initial) {
    return {
      code: initial.code ?? null,
      name: initial.name,
      description: initial.description ?? '',
      type: initial.type,
      startAt: initial.startAt.slice(0, 16),
      endAt: initial.endAt ? initial.endAt.slice(0, 16) : null,
      discountType: initial.discountType,
      discountValue: initial.discountValue,
      maxDiscountAmount: initial.maxDiscountAmount ?? null,
      priority: initial.priority,
      isExclusive: initial.isExclusive,
      isAutomatic: initial.isAutomatic,
      maxTotalUsage: initial.maxTotalUsage ?? null,
      maxUsagePerCustomer: initial.maxUsagePerCustomer ?? null,
      storeId: initial.storeId ?? null,
      audienceTag: initial.audienceTag ?? null,
      conditions: initial.conditions ?? [],
      rewards: initial.rewards ?? [],
    };
  }
  const type = defaultType ?? 'Code';
  return {
    code: type === 'Code' ? '' : null,
    name: '',
    description: '',
    type,
    startAt: nowLocal(),
    endAt: plusDays(30),
    discountType: 'Percent',
    discountValue: 10,
    maxDiscountAmount: 500_000,
    priority: 100,
    isExclusive: false,
    isAutomatic: type !== 'Code',
    maxTotalUsage: null,
    maxUsagePerCustomer: null,
    storeId: null,
    audienceTag: null,
    conditions: [],
    rewards: [],
  };
}

const STEPS = ['Thông tin cơ bản', 'Điều kiện & phần thưởng', 'Xem trước'] as const;

export function PromotionWizard({ initial, defaultType, onClose, onSaved }: PromotionWizardProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => buildInitialForm(initial, defaultType));

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validated = useMemo(() => {
    if (!form.name.trim()) return 'Tên promotion là bắt buộc';
    if (form.type === 'Code' && !form.code?.trim()) return 'Loại Code phải có Mã';
    if (form.discountType === 'Percent' && !form.maxDiscountAmount) return 'Giảm % bắt buộc có MaxDiscountAmount';
    if (form.endAt && form.startAt && new Date(form.endAt) <= new Date(form.startAt)) return 'Ngày kết thúc phải sau ngày bắt đầu';
    return null;
  }, [form]);

  const submit = async () => {
    if (validated) { toast.error(validated); return; }
    setSaving(true);
    try {
      const payload: CreatePromotionDto = {
        ...form,
        code: form.code?.trim() || null,
        startAt: normaliseIso(form.startAt),
        endAt: form.endAt ? normaliseIso(form.endAt) : null,
      };
      if (initial) {
        await promotionsApi.update(initial.id, payload);
        toast.success('Đã cập nhật promotion');
      } else {
        await promotionsApi.create(payload);
        toast.success('Đã tạo promotion');
      }
      onSaved();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Không lưu được — kiểm tra backend đã có endpoint /api/promotions chưa.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{initial ? 'Sửa promotion' : 'Tạo promotion mới'}</h2>
            <p className="text-xs text-gray-500">Bước {step + 1}/{STEPS.length} — {STEPS[step]}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </header>

        <div className="flex gap-1 px-6 pt-3">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 0 && <BasicInfoStep form={form} setField={setField} />}
          {step === 1 && (
            <PromotionBuilder
              conditions={form.conditions}
              rewards={form.rewards}
              showRewards={form.discountType === 'BuyXGetY'}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            />
          )}
          {step === 2 && <PromotionPreview draft={form} />}
        </div>

        <footer className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700 disabled:opacity-40 hover:bg-white rounded-lg"
          >
            <ChevronLeft className="w-4 h-4" /> Quay lại
          </button>
          <div className="flex items-center gap-2">
            {step < STEPS.length - 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="flex items-center gap-1 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Tiếp <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={saving || !!validated}
              className="flex items-center gap-1 px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50"
              title={validated ?? 'Lưu'}
            >
              <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Basic info sub-form
// ---------------------------------------------------------------------------
type FormShape = ReturnType<typeof buildInitialForm>;
type SetField = <K extends keyof FormShape>(key: K, value: FormShape[K]) => void;

function BasicInfoStep({ form, setField }: { form: FormShape; setField: SetField }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Tên promotion *" className="md:col-span-2">
        <input value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputCls} placeholder="VD: Giảm 10% laptop tháng 8" />
      </Field>
      <Field label="Loại">
        <select value={form.type} onChange={(e) => setField('type', e.target.value as FormShape['type'])} className={inputCls}>
          <option value="Code">Mã nhập tay</option>
          <option value="Automatic">Tự động</option>
          <option value="FlashSale">Flash Sale</option>
        </select>
      </Field>
      <Field label="Mã (chỉ với loại Code)">
        <input value={form.code ?? ''} onChange={(e) => setField('code', e.target.value.toUpperCase())} className={inputCls} placeholder="VD: BACKTOSCHOOL" disabled={form.type !== 'Code'} />
      </Field>
      <Field label="Loại giảm">
        <select value={form.discountType} onChange={(e) => setField('discountType', e.target.value as FormShape['discountType'])} className={inputCls}>
          <option value="Percent">Giảm %</option>
          <option value="Fixed">Giảm tiền cố định</option>
          <option value="FreeShip">Miễn phí ship</option>
          <option value="BuyXGetY">Mua X tặng Y</option>
          <option value="Tiered">Bậc thang</option>
        </select>
      </Field>
      <Field label="Giá trị giảm">
        <input type="number" value={form.discountValue} min={0} onChange={(e) => setField('discountValue', Number(e.target.value) || 0)} className={inputCls} />
      </Field>
      {form.discountType === 'Percent' && (
        <Field label="Trần giảm tối đa (đ) *">
          <input type="number" value={form.maxDiscountAmount ?? ''} min={0} onChange={(e) => setField('maxDiscountAmount', e.target.value ? Number(e.target.value) : null)} className={inputCls} />
        </Field>
      )}
      <Field label="Bắt đầu">
        <input type="datetime-local" value={form.startAt} onChange={(e) => setField('startAt', e.target.value)} className={inputCls} />
      </Field>
      <Field label="Kết thúc">
        <input type="datetime-local" value={form.endAt ?? ''} onChange={(e) => setField('endAt', e.target.value || null)} className={inputCls} />
      </Field>
      <Field label="Ưu tiên (cao hơn áp trước)">
        <input type="number" value={form.priority} onChange={(e) => setField('priority', Number(e.target.value) || 0)} className={inputCls} />
      </Field>
      <Field label="Tổng lượt tối đa">
        <input type="number" value={form.maxTotalUsage ?? ''} min={1} onChange={(e) => setField('maxTotalUsage', e.target.value ? Number(e.target.value) : null)} className={inputCls} placeholder="Không giới hạn" />
      </Field>
      <Field label="Lượt / khách">
        <input type="number" value={form.maxUsagePerCustomer ?? ''} min={1} onChange={(e) => setField('maxUsagePerCustomer', e.target.value ? Number(e.target.value) : null)} className={inputCls} placeholder="Không giới hạn" />
      </Field>
      <Field label="Store ID (nếu chỉ áp 1 chi nhánh)">
        <input value={form.storeId ?? ''} onChange={(e) => setField('storeId', e.target.value || null)} className={inputCls} placeholder="Bỏ trống = toàn hệ thống" />
      </Field>
      <Field label="Audience tag">
        <select value={form.audienceTag ?? ''} onChange={(e) => setField('audienceTag', e.target.value || null)} className={inputCls}>
          <option value="">Tất cả</option>
          <option value="Personal">Cá nhân</option>
          <option value="Student">Học sinh - Sinh viên</option>
          <option value="Business">Doanh nghiệp</option>
        </select>
      </Field>
      <Field label="Mô tả" className="md:col-span-2">
        <textarea value={form.description ?? ''} rows={2} onChange={(e) => setField('description', e.target.value)} className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
        <input type="checkbox" checked={form.isExclusive} onChange={(e) => setField('isExclusive', e.target.checked)} className="rounded text-accent" />
        Loại trừ — áp xong dừng, không cộng dồn khuyến mãi khác
      </label>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-accent';

function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`text-xs font-semibold text-gray-700 ${className}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default PromotionWizard;
