import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { formatNumber } from '../../utils/format';
import type { Product, ProductMedia } from '../../api/catalog';

interface ProductDetailStickyBuyBarProps {
  show: boolean;
  product: Product;
  displayMedia?: ProductMedia;
  displayPrice: number;
  stockQuantity: number;
  addingToCart: boolean;
  onBuyNow: () => void;
  onAddToCart: () => void;
}

/** Mobile sticky "buy now / add to cart" bar shown when scrolled past the fold. */
export default function ProductDetailStickyBuyBar({
  show,
  product,
  displayMedia,
  displayPrice,
  stockQuantity,
  addingToCart,
  onBuyNow,
  onAddToCart,
}: ProductDetailStickyBuyBarProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] py-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden md:flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-gray-50 rounded-lg p-0.5 flex-shrink-0">
                {displayMedia && <img src={displayMedia.url} alt="" className="w-full h-full object-contain" />}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
                <span className="text-accent font-bold text-sm">{formatNumber(displayPrice)}<sup className="text-[10px] font-bold ml-0.5">₫</sup></span>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={onBuyNow}
                disabled={stockQuantity === 0}
                className="flex-1 md:flex-none bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-lg font-semibold text-sm transition-all active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                MUA NGAY
              </button>
              <button
                onClick={onAddToCart}
                disabled={stockQuantity === 0 || addingToCart}
                className="flex-1 md:flex-none border-2 border-accent text-accent px-6 py-3 rounded-lg hover:bg-red-50 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ShoppingCart className="w-[18px] h-[18px]" />
                <span className="hidden sm:inline">{addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
