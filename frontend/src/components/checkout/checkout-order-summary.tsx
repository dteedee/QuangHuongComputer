import { ShoppingBag, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CheckoutOrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  discountAmount: number;
  shippingAmount: number;
}

export default function CheckoutOrderSummary({ items, subtotal, tax, total, discountAmount, shippingAmount }: CheckoutOrderSummaryProps) {
  return (
    <div className="sticky top-28 space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 px-5 py-4 text-white flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide">Don hang cua ban</h3>
            <p className="text-white/50 text-xs">{items.length} san pham</p>
          </div>
          <ShoppingBag className="w-5 h-5 text-accent" />
        </div>

        <div className="p-5">
          {/* Items list */}
          <div className="max-h-[300px] overflow-y-auto space-y-3 mb-5 pr-1 scrollbar-thin">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <span className="text-2xl font-bold">{item?.name?.charAt(0) || '?'}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-xs truncate">{item.name}</h4>
                  <div className="flex justify-between items-end mt-1">
                    <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">SL: {item.quantity}</span>
                    <span className="font-bold text-xs text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-2.5 pt-4 border-t border-dashed border-gray-200 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Tam tinh</span>
              <span className="font-semibold text-gray-800">{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Khuyen mai</span>
                <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Van chuyen</span>
              {shippingAmount === 0 ? (
                <span className="font-semibold text-emerald-600">Mien phi</span>
              ) : (
                <span className="font-semibold text-gray-800">{formatCurrency(shippingAmount)}</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Thue GTGT (10%)</span>
              <span className="font-semibold text-gray-800">{formatCurrency(tax || Math.round(subtotal * 0.1))}</span>
            </div>
            <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
              <span className="font-bold text-gray-900 text-base">TONG</span>
              <div className="text-right">
                <span className="block font-bold text-xl text-accent">{formatCurrency(total)}</span>
                <span className="text-[10px] text-gray-400">Da bao gom chi phi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security badge */}
      <div className="bg-red-50/50 rounded-xl p-4 border border-red-100 flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-accent">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-gray-900 text-sm">Thanh toan an toan</h4>
          <p className="text-[11px] text-gray-500">Du lieu ca nhan duoc bao mat theo chuan SSL</p>
        </div>
      </div>
    </div>
  );
}
