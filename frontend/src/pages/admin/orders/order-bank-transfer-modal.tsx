/**
 * D04 — "Xác nhận chuyển khoản" confirms ONE pending payment intent (not the
 * order directly): pick which pending payment, enter the bank reference the
 * money arrived with, `POST /payments/reconciliation/confirm/{paymentId}`.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, Loader2, X } from 'lucide-react';
import { formatCurrency } from '../../../utils/format';

/** One `PaymentIntent` row from `getPaymentIntentsForOrder` (provider `SePay`, status `Pending`). */
export interface PendingBankTransferIntent {
    id: string;
    amount: number;
}

interface OrderBankTransferModalProps {
    open: boolean;
    onClose: () => void;
    pendingPayments: PendingBankTransferIntent[];
    onSubmit: (data: { paymentId: string; bankReference: string }) => void;
    isSubmitting: boolean;
}

export const OrderBankTransferModal = ({ open, onClose, pendingPayments, onSubmit, isSubmitting }: OrderBankTransferModalProps) => {
    const [paymentId, setPaymentId] = useState(pendingPayments[0]?.id ?? '');
    const [bankReference, setBankReference] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentId || !bankReference.trim()) {
            setError('Vui lòng chọn khoản thu và nhập mã tham chiếu ngân hàng');
            return;
        }
        setError('');
        onSubmit({ paymentId, bankReference: bankReference.trim() });
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-md overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-50 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                                    <Landmark size={20} />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Xác nhận chuyển khoản</h2>
                            </div>
                            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-accent">
                                <X size={18} />
                            </button>
                        </div>
                        {pendingPayments.length === 0 ? (
                            <div className="p-6 text-sm text-gray-400">Không có khoản chuyển khoản đang chờ đối soát.</div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold text-gray-400 uppercase">Khoản thu đang chờ</label>
                                    <select value={paymentId} onChange={(e) => setPaymentId(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm font-semibold outline-none">
                                        {pendingPayments.map((p) => (
                                            <option key={p.id} value={p.id}>{formatCurrency(p.amount)} — {p.id.slice(0, 8)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold text-gray-400 uppercase">Mã tham chiếu ngân hàng</label>
                                    <input value={bankReference} onChange={(e) => setBankReference(e.target.value)}
                                        placeholder="VD: FT26091812345"
                                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${error ? 'border-red-400' : 'border-transparent'} rounded-xl text-sm font-semibold outline-none`} />
                                    {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-500 text-xs font-semibold uppercase rounded-xl">
                                        Hủy
                                    </button>
                                    <button type="submit" disabled={isSubmitting}
                                        className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white text-xs font-semibold uppercase rounded-xl disabled:opacity-50">
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Landmark size={16} />}
                                        Xác nhận đã nhận tiền
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
