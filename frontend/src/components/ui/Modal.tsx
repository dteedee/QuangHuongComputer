import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
}: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-8 border-b border-gray-50">
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">
                  {title}
                </h2>
                {description && (
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-[#D70018] transition-all"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="flex gap-4 p-8 pt-0">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
