/**
 * Mobile sticky buy bar — the thumb-zone copy of the CTA, shown once the real
 * buy box has scrolled away. Motion comes from the design-system presets, not
 * from inline `initial={{…}}` objects (design-direction §"không tự chế chuyển
 * động"). D09: it shows a state, never a quantity.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';

import type { Product } from '../../api/catalog';
import type { ProductMediaView } from '../../api/catalog/public-product';
import { dur, ease } from '../../design-system/motion';
import { formatNumber } from '../../utils/format';
import { Button, Img } from '../ui';

interface ProductDetailStickyBuyBarProps {
  show: boolean;
  product: Product;
  displayMedia?: ProductMediaView;
  displayPrice: number;
  stockQuantity: number;
  addingToCart: boolean;
  onBuyNow: () => void;
  onAddToCart: () => void;
}

export default function ProductDetailStickyBuyBar({
  show, product, displayMedia, displayPrice, stockQuantity, addingToCart, onBuyNow, onAddToCart,
}: ProductDetailStickyBuyBarProps) {
  const outOfStock = stockQuantity <= 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 96, opacity: 0 }}
          transition={{ duration: dur.move, ease: ease.expo }}
          className="fixed bottom-0 left-0 right-0 z-[100] border-t border-line bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgb(0_0_0/.08)]"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
                <Img
                  src={displayMedia?.url ?? product.imageUrl}
                  alt=""
                  ratio="1/1"
                  fit="contain"
                  blend
                  wrapperClassName="h-full w-full"
                />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-fg">{product.name}</h2>
                <span className="num price text-sm font-bold text-brand-text">
                  {formatNumber(displayPrice)}<sup className="ml-0.5 text-[10px] font-bold">₫</sup>
                </span>
              </div>
            </div>
            <div className="flex w-full gap-3 md:w-auto">
              <Button className="flex-1 md:flex-none" onClick={onBuyNow} disabled={outOfStock} loading={addingToCart}>
                MUA NGAY
              </Button>
              <Button
                className="flex-1 md:flex-none"
                variant="secondary"
                onClick={onAddToCart}
                disabled={outOfStock}
                loading={addingToCart}
              >
                <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" />
                THÊM VÀO GIỎ
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
