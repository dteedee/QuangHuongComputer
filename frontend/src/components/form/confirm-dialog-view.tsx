/**
 * The confirm-dialog visual, extracted verbatim from `ConfirmContext.tsx`
 * (W1-9) so that file stays under the 200-LOC guideline once `usePrompt` is
 * added to it. Pure presentation — `ConfirmContext.tsx` owns all the state.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Info, Trash2 } from 'lucide-react';
import type { ConfirmOptions, ConfirmVariant } from './confirm-prompt-types';

const variantConfig: Record<ConfirmVariant, {
  icon: typeof AlertTriangle;
  iconBg: string;
  iconColor: string;
  confirmBg: string;
  confirmHover: string;
  confirmShadow: string;
  ringColor: string;
}> = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmBg: 'bg-red-600',
    confirmHover: 'hover:bg-red-700',
    confirmShadow: 'shadow-red-500/25',
    ringColor: 'focus:ring-red-300',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmBg: 'bg-amber-500',
    confirmHover: 'hover:bg-amber-600',
    confirmShadow: 'shadow-amber-500/25',
    ringColor: 'focus:ring-amber-300',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmBg: 'bg-blue-600',
    confirmHover: 'hover:bg-blue-700',
    confirmShadow: 'shadow-blue-500/25',
    ringColor: 'focus:ring-blue-300',
  },
};

export interface ConfirmDialogViewProps {
  state: ConfirmOptions | null;
  onClose: (result: boolean) => void;
}

export function ConfirmDialogView({ state, onClose }: ConfirmDialogViewProps) {
  const variant = state?.variant ?? 'danger';
  const cfg = variantConfig[variant];
  const Icon = cfg.icon;

  return (
    <AnimatePresence>
      {state && (
        // Inline `pointerEvents: 'auto'` is required, not decorative — the
        // exact same override Radix's OWN Dialog content uses (verified by
        // reading its rendered output): a Radix `Dialog` (CrudFormDialog
        // uses one) sets `pointer-events: none` on `<body>` while modal-open
        // to block the background. This overlay is a SIBLING of Radix's
        // portal, not inside it, so it inherits that `none` and would be
        // visible but genuinely unclickable without this. A Tailwind
        // *class* would work in the real app but not prove itself in a
        // jsdom unit test (no stylesheet is loaded there) — inline style
        // is what Radix itself relies on, so this does too.
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onClose(false)}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <button
              onClick={() => onClose(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <X size={18} />
            </button>

            <div className="px-8 pt-8 pb-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.1 }}
                className={`w-16 h-16 mx-auto rounded-2xl ${cfg.iconBg} ${cfg.iconColor} flex items-center justify-center mb-5`}
              >
                <Icon size={28} strokeWidth={2.5} />
              </motion.div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">{state.title || 'Xác nhận'}</h3>

              <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-line">{state.message}</p>
            </div>

            <div className="px-8 pb-8 flex gap-3">
              <button
                onClick={() => onClose(false)}
                className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-700 font-bold text-sm rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {state.cancelText || 'Hủy'}
              </button>
              <button
                onClick={() => onClose(true)}
                autoFocus
                className={`flex-1 px-6 py-3.5 text-white font-bold text-sm rounded-2xl transition-all active:scale-[0.97] shadow-lg focus:outline-none focus:ring-2 ${cfg.confirmBg} ${cfg.confirmHover} ${cfg.confirmShadow} ${cfg.ringColor}`}
              >
                {state.confirmText || 'Xác nhận'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ConfirmDialogView;
