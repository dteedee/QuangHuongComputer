import { useState } from 'react';
import { Play, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { promotionsApi, type CreatePromotionDto, type EvaluateCartLine, type PricingResult } from '../../api/promotions';

interface PresetCart {
  key: string;
  label: string;
  description: string;
  subtotal: number;
  shippingFee: number;
  lines: EvaluateCartLine[];
}

const PRESET_CARTS: PresetCart[] = [
  {
    key: 'basic',
    label: 'Giỏ nhỏ',
    description: '1 sản phẩm 500.000đ',
    subtotal: 500_000,
    shippingFee: 30_000,
    lines: [{ productId: 'preset-basic-1', productName: 'Chuột không dây', quantity: 1, unitPrice: 500_000 }],
  },
  {
    key: 'medium',
    label: 'Giỏ trung bình',
    description: '3 sản phẩm 3.000.000đ',
    subtotal: 3_000_000,
    shippingFee: 40_000,
    lines: [
      { productId: 'preset-med-1', productName: 'Bàn phím cơ', quantity: 1, unitPrice: 1_500_000 },
      { productId: 'preset-med-2', productName: 'Tai nghe', quantity: 2, unitPrice: 750_000 },
    ],
  },
  {
    key: 'large',
    label: 'Giỏ lớn',
    description: '8 sản phẩm 15.000.000đ',
    subtotal: 15_000_000,
    shippingFee: 50_000,
    lines: [
      { productId: 'preset-large-1', productName: 'Laptop Gaming', quantity: 1, unitPrice: 12_000_000 },
      { productId: 'preset-large-2', productName: 'Balo Laptop', quantity: 2, unitPrice: 800_000 },
      { productId: 'preset-large-3', productName: 'Chuột Gaming', quantity: 5, unitPrice: 280_000 },
    ],
  },
];

interface PromotionPreviewProps {
  draft: CreatePromotionDto;
}

const formatVnd = (n: number) => `${(n || 0).toLocaleString('vi-VN')}đ`;

export function PromotionPreview({ draft }: PromotionPreviewProps) {
  const [selected, setSelected] = useState<string>('medium');
  const [result, setResult] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState(false);

  const preset = PRESET_CARTS.find((p) => p.key === selected) ?? PRESET_CARTS[1];

  const run = async () => {
    setLoading(true);
    try {
      const res = await promotionsApi.evaluate({
        lines: preset.lines,
        subtotal: preset.subtotal,
        shippingFee: preset.shippingFee,
        appliedCodes: draft.code ? [draft.code] : [],
        draftPromotion: draft,
      });
      setResult(res);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Không gọi được API evaluate — backend chưa sẵn sàng?';
      toast.error(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const warnOverdiscount = result && preset.subtotal > 0
    && (result.totalDiscount / preset.subtotal) > 0.5;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-gray-700">Chọn giỏ mẫu để xem trước</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          {PRESET_CARTS.map((p) => (
            <button
              type="button"
              key={p.key}
              onClick={() => { setSelected(p.key); setResult(null); }}
              className={`text-left border rounded-xl p-3 transition-colors ${
                selected === p.key ? 'border-accent bg-accent/5' : 'border-gray-200 hover:border-accent'
              }`}
            >
              <div className="text-sm font-bold text-gray-900">{p.label}</div>
              <div className="text-xs text-gray-500 mt-1">{p.description}</div>
              <div className="text-xs text-gray-400 mt-1">
                Ship dự kiến {formatVnd(p.shippingFee)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-60"
      >
        <Play className="w-4 h-4" />
        {loading ? 'Đang tính...' : 'Xem tác động'}
      </button>

      {result && (
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
          <div className="flex items-center gap-2">
            {result.isApplicable ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="font-semibold text-sm">
              {result.isApplicable ? 'Promotion áp được cho giỏ này' : 'Không thoả điều kiện — không áp được'}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-gray-500">Tạm tính</dt>
            <dd className="text-right font-medium">{formatVnd(result.subtotal)}</dd>

            <dt className="text-gray-500">Giảm theo dòng</dt>
            <dd className="text-right text-red-600">
              -{formatVnd(result.lineDiscounts.reduce((s, l) => s + l.amount, 0))}
            </dd>

            <dt className="text-gray-500">Giảm toàn đơn</dt>
            <dd className="text-right text-red-600">-{formatVnd(result.orderDiscount)}</dd>

            <dt className="text-gray-500">Giảm phí ship</dt>
            <dd className="text-right text-red-600">-{formatVnd(result.shippingDiscount)}</dd>

            <dt className="text-gray-800 font-semibold pt-2 border-t border-gray-200">Tổng giảm</dt>
            <dd className="text-right font-bold text-red-600 pt-2 border-t border-gray-200">
              -{formatVnd(result.totalDiscount)}
            </dd>

            <dt className="text-gray-800 font-semibold">Còn phải trả</dt>
            <dd className="text-right font-bold text-accent">{formatVnd(result.finalTotal)}</dd>
          </dl>

          {result.freeGifts.length > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <div className="text-xs font-semibold text-gray-700 mb-1">Quà tặng kèm</div>
              <ul className="text-sm text-gray-700 list-disc list-inside">
                {result.freeGifts.map((g, i) => (
                  <li key={i}>{g.productName ?? g.productId} × {g.quantity}</li>
                ))}
              </ul>
            </div>
          )}

          {warnOverdiscount && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Cảnh báo: mức giảm vượt 50% giá trị đơn — rủi ro bán lỗ, cần review thủ công.
              </span>
            </div>
          )}

          {result.warnings && result.warnings.length > 0 && (
            <ul className="text-xs text-amber-700 list-disc list-inside">
              {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default PromotionPreview;
