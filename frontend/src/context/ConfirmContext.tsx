import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Info, Trash2, ShieldAlert } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────────
export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// ── Context ─────────────────────────────────────────────────────────────────────
const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx.confirm;
}

// ── Variant Styles ──────────────────────────────────────────────────────────────
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

// ── Provider ────────────────────────────────────────────────────────────────────
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    setState(options);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(null);
  }, []);

  const variant = state?.variant ?? 'danger';
  const cfg = variantConfig[variant];
  const Icon = cfg.icon;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      <AnimatePresence>
        {state && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleClose(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => handleClose(false)}
                className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <X size={18} />
              </button>

              {/* Content */}
              <div className="px-8 pt-8 pb-6 text-center">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.1 }}
                  className={`w-16 h-16 mx-auto rounded-2xl ${cfg.iconBg} ${cfg.iconColor} flex items-center justify-center mb-5`}
                >
                  <Icon size={28} strokeWidth={2.5} />
                </motion.div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {state.title || 'Xác nhận'}
                </h3>

                {/* Message */}
                <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-line">
                  {state.message}
                </p>
              </div>

              {/* Actions */}
              <div className="px-8 pb-8 flex gap-3">
                <button
                  onClick={() => handleClose(false)}
                  className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-700 font-bold text-sm rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  {state.cancelText || 'Hủy'}
                </button>
                <button
                  onClick={() => handleClose(true)}
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
    </ConfirmContext.Provider>
  );
}
