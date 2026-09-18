/**
 * The prompt-dialog visual behind `usePrompt()` — same motion language as
 * `ConfirmDialogView` (this is the styled replacement for native
 * `window.prompt`), but with an input instead of just two buttons. Pure
 * presentation; `ConfirmContext.tsx` owns the state and the resolve/reject.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';
import { formatDong } from '../ui/kit-utils';
import type { PromptState } from './confirm-prompt-types';

export interface PromptDialogViewProps {
  state: PromptState | null;
  onConfirm: (value: string | number) => void;
  onCancel: () => void;
}

export function PromptDialogView({ state, onConfirm, onCancel }: PromptDialogViewProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!state) return;
    if (state.kind === 'text') setValue(state.options.defaultValue ?? '');
    else if (state.kind === 'amount') setValue(state.options.defaultValue != null ? String(state.options.defaultValue) : '');
    else setValue(state.options.defaultValue ?? state.options.options[0]?.value ?? '');
  }, [state]);

  const required = state?.options.required ?? true;
  const isEmpty = value.trim() === '';
  const canConfirm = !required || !isEmpty;

  const handleConfirm = () => {
    if (!state || !canConfirm) return;
    onConfirm(state.kind === 'amount' ? Number(value.replace(/[^\d-]/g, '')) || 0 : value);
  };

  return (
    <AnimatePresence>
      {state && (
        // Inline pointerEvents required — see `confirm-dialog-view.tsx` header comment.
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCancel}
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
              onClick={onCancel}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <X size={18} />
            </button>

            <div className="px-8 pt-8 pb-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-5">
                <HelpCircle size={28} strokeWidth={2.5} />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">{state?.options.title || 'Nhập thông tin'}</h3>
              {state?.options.message && (
                <p className="text-gray-500 text-sm leading-relaxed text-center mb-4 whitespace-pre-line">{state.options.message}</p>
              )}

              {state?.kind === 'text' && (
                <input
                  autoFocus
                  type="text"
                  value={value}
                  maxLength={state.options.maxLength}
                  placeholder={state.options.placeholder}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                />
              )}

              {state?.kind === 'amount' && (
                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    inputMode="numeric"
                    value={value ? formatDong(Number(value.replace(/[^\d-]/g, '')) || 0) : ''}
                    placeholder={state.options.placeholder}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^\d]/g, '');
                      let n = digits === '' ? 0 : Number(digits);
                      if (typeof state.options.max === 'number') n = Math.min(n, state.options.max);
                      if (typeof state.options.min === 'number') n = Math.max(n, state.options.min);
                      setValue(digits === '' ? '' : String(n));
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {state.options.suffix ?? 'đ'}
                  </span>
                </div>
              )}

              {state?.kind === 'select' && (
                <select
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                >
                  {state.options.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="px-8 pb-8 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-700 font-bold text-sm rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {state?.options.cancelText || 'Hủy'}
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="flex-1 px-6 py-3.5 bg-blue-600 text-white font-bold text-sm rounded-2xl hover:bg-blue-700 transition-all active:scale-[0.97] shadow-lg shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:pointer-events-none"
              >
                {state?.options.confirmText || 'Xác nhận'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default PromptDialogView;
