import { useState } from 'react';
import { Plus, Trash2, ChevronDown, Gift } from 'lucide-react';
import type { ConditionType, PromotionCondition, PromotionReward } from '../../api/promotions';
import { CONDITION_META, ConditionEditor, defaultCondition, describeCondition } from './promotion-condition-editors';

interface PromotionBuilderProps {
  conditions: PromotionCondition[];
  rewards: PromotionReward[];
  /** 'BuyXGetY' → mở khối Rewards. */
  showRewards?: boolean;
  onChange: (patch: { conditions?: PromotionCondition[]; rewards?: PromotionReward[] }) => void;
}

export function PromotionBuilder({ conditions, rewards, showRewards, onChange }: PromotionBuilderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const addCondition = (type: ConditionType) => {
    onChange({ conditions: [...conditions, defaultCondition(type)] });
    setPickerOpen(false);
  };

  const updateCondition = (index: number, patch: Partial<PromotionCondition>) => {
    const next = conditions.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange({ conditions: next });
  };

  const removeCondition = (index: number) => {
    onChange({ conditions: conditions.filter((_, i) => i !== index) });
  };

  const addReward = () => {
    onChange({ rewards: [...rewards, { productId: null, variantId: null, quantity: 1, discountPercent: 100 }] });
  };

  const updateReward = (index: number, patch: Partial<PromotionReward>) => {
    onChange({ rewards: rewards.map((r, i) => (i === index ? { ...r, ...patch } : r)) });
  };

  const removeReward = (index: number) => {
    onChange({ rewards: rewards.filter((_, i) => i !== index) });
  };

  const usedTypes = new Set(conditions.map((c) => c.type));

  return (
    <div className="space-y-6">
      {/* Conditions section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">Điều kiện áp dụng</h3>
            <p className="text-xs text-gray-500">
              Tất cả các điều kiện phải cùng thoả (AND). Không thêm gì = luôn áp dụng.
            </p>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover"
            >
              <Plus className="w-4 h-4" /> Thêm điều kiện
              <ChevronDown className="w-4 h-4" />
            </button>
            {pickerOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-80 overflow-y-auto">
                {CONDITION_META.map((meta) => {
                  const disabled = usedTypes.has(meta.type);
                  return (
                    <button
                      key={meta.type}
                      type="button"
                      disabled={disabled}
                      onClick={() => addCondition(meta.type)}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 text-sm ${
                        disabled ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{meta.label}</div>
                      <div className="text-xs text-gray-500">{meta.description}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {conditions.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
            Chưa có điều kiện. Promotion sẽ áp dụng cho mọi đơn phù hợp thời hạn.
          </div>
        ) : (
          <ul className="space-y-3">
            {conditions.map((c, index) => {
              const meta = CONDITION_META.find((m) => m.type === c.type);
              return (
                <li key={`${c.type}-${index}`} className="border border-gray-200 rounded-xl p-4 bg-white">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{meta?.label ?? c.type}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{describeCondition(c)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCondition(index)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      title="Xoá điều kiện"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <ConditionEditor condition={c} update={(patch) => updateCondition(index, patch)} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Rewards section (BuyXGetY) */}
      {showRewards && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Gift className="w-4 h-4 text-accent" /> Phần thưởng (Mua X Tặng Y)
              </h3>
              <p className="text-xs text-gray-500">Chọn sản phẩm tặng kèm và số lượng.</p>
            </div>
            <button
              type="button"
              onClick={addReward}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:border-accent hover:text-accent"
            >
              <Plus className="w-4 h-4" /> Thêm phần thưởng
            </button>
          </div>

          {rewards.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
              Chưa có phần thưởng. Bấm "Thêm phần thưởng" để cấu hình.
            </div>
          ) : (
            <ul className="space-y-3">
              {rewards.map((r, index) => (
                <li key={index} className="border border-gray-200 rounded-xl p-4 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <label className="text-xs font-medium text-gray-700 md:col-span-2">
                      Product ID (variant tuỳ chọn)
                      <input
                        type="text"
                        value={r.productId ?? ''}
                        onChange={(e) => updateReward(index, { productId: e.target.value || null })}
                        placeholder="UUID sản phẩm"
                        className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-accent"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-700">
                      Số lượng
                      <input
                        type="number"
                        min={1}
                        value={r.quantity}
                        onChange={(e) => updateReward(index, { quantity: Number(e.target.value) || 1 })}
                        className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-accent"
                      />
                    </label>
                    <label className="text-xs font-medium text-gray-700">
                      % giảm (100 = tặng)
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={r.discountPercent}
                        onChange={(e) => updateReward(index, { discountPercent: Number(e.target.value) || 0 })}
                        className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-accent"
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeReward(index)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Xoá phần thưởng
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export default PromotionBuilder;
