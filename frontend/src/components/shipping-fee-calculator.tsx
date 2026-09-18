import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { salesCartCheckoutApi, type ShippingQuoteDto } from '../api/sales/cart-checkout';
import { normalizeApiError } from '../lib/api-error';
import { Button, Price } from './ui';

interface ShippingFeeCalculatorProps {
  /** Tạm tính SAU giảm giá — server dùng đúng con số này để áp ngưỡng miễn phí. */
  netSubtotal: number;
  provinceCode?: string;
  wardCode?: string;
  isPickup?: boolean;
  weightGrams?: number;
  onQuote?: (quote: ShippingQuoteDto) => void;
}

const SOURCE_LABEL: Record<ShippingQuoteDto['source'], string> = {
  pickup: 'Nhận tại cửa hàng — không tính phí giao',
  free_threshold: 'Đơn đã đạt ngưỡng miễn phí giao hàng',
  flat: 'Phí giao hàng đồng giá toàn quốc',
  ghn_live: 'Phí do đơn vị vận chuyển báo',
};

/**
 * Phí vận chuyển do SERVER báo (`POST /api/sales/shipping/quote`, hợp đồng W2-11 §1).
 * FE không bao giờ tự tính phí và không bao giờ gửi phí lên — nếu gọi hỏng thì hiện lỗi
 * kèm nút thử lại, chứ không đoán một con số.
 */
export default function ShippingFeeCalculator({
  netSubtotal, provinceCode, wardCode, isPickup = false, weightGrams = 500, onQuote,
}: ShippingFeeCalculatorProps) {
  const [quote, setQuote] = useState<ShippingQuoteDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    salesCartCheckoutApi.shipping
      .quote({ netSubtotal, isPickup, provinceCode, wardCode, weightGrams })
      .then((result) => {
        if (cancelled) return;
        setQuote(result);
        onQuote?.(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setQuote(null);
        setError(normalizeApiError(err).message);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // `onQuote` cố tình không nằm trong deps: nơi gọi thường truyền arrow inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [netSubtotal, provinceCode, wardCode, isPickup, weightGrams, attempt]);

  if (loading) {
    return (
      <div className="h-[52px] rounded-lg bg-sunken animate-pulse" aria-label="Đang tính phí vận chuyển" />
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger/40 bg-danger-subtle px-3 py-2.5 text-13 text-danger flex items-center justify-between gap-3">
        <span>{error}</span>
        <Button size="sm" variant="outline" onClick={() => setAttempt(a => a + 1)}>Thử lại</Button>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="rounded-lg border border-line bg-sunken px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-13 text-fg-muted">
          <Truck className="w-4 h-4 text-brand" aria-hidden />
          Phí vận chuyển
        </span>
        {quote.isFreeShipping
          ? <span className="font-semibold text-success text-sm">Miễn phí</span>
          : <Price value={quote.fee} className="font-semibold text-sm" />}
      </div>
      <p className="mt-1 pl-6 text-2xs text-fg-subtle">{SOURCE_LABEL[quote.source]}</p>
      {quote.estimatedDeliveryDays && (
        <p className="pl-6 text-2xs text-fg-subtle">Dự kiến giao: {quote.estimatedDeliveryDays}</p>
      )}
    </div>
  );
}
