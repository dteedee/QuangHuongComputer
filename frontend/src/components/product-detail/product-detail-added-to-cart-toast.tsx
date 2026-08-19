import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface ProductDetailAddedToCartToastProps {
  show: boolean;
}

/** Small floating toast confirming an item was added to the cart. */
export default function ProductDetailAddedToCartToast({ show }: ProductDetailAddedToCartToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50"
        >
          <Check className="w-5 h-5" />
          <span className="font-medium text-sm">Đã thêm vào giỏ hàng!</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
