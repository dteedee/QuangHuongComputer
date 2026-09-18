/**
 * "Giao hàng" action — carrier + tracking number. Manual entry (GHN off /
 * not configured) per phase spec step 2. No native `window.prompt`.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Truck, X } from 'lucide-react';

interface OrderShipModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: { carrier: string; trackingNumber: string }) => void;
    isSubmitting: boolean;
}

const CARRIER_OPTIONS = ['GHN', 'GHTK', 'Viettel Post', 'J&T Express', 'Ninja Van', 'Tự vận chuyển'];

export const OrderShipModal = ({ open, onClose, onSubmit, isSubmitting }: OrderShipModalProps) => {
    const [carrier, setCarrier] = useState(CARRIER_OPTIONS[0]);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackingNumber.trim()) {
            setError('Vui lòng nhập mã vận đơn');
            return;
        }
        setError('');
        onSubmit({ carrier, trackingNumber: trackingNumber.trim() });
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
                                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500">
                                    <Truck size={20} />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Giao hàng</h2>
                            </div>
                            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-accent">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase">Đơn vị vận chuyển</label>
                                <select value={carrier} onChange={(e) => setCarrier(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm font-semibold outline-none">
                                    {CARRIER_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase">Mã vận đơn</label>
                                <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="VD: GHN12345678"
                                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border ${error ? 'border-red-400' : 'border-transparent'} rounded-xl text-sm font-semibold outline-none`} />
                                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 text-gray-500 text-xs font-semibold uppercase rounded-xl">
                                    Hủy
                                </button>
                                <button type="submit" disabled={isSubmitting}
                                    className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white text-xs font-semibold uppercase rounded-xl disabled:opacity-50">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                                    Xác nhận giao hàng
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
