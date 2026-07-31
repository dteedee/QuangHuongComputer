import { useEffect, useState } from 'react';
import { X, Send, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { rfqApi, inventoryApi } from '../../api/inventory';
import type { RequestForQuotation, SupplierDropdownItem } from '../../api/inventory';

interface Props {
    rfq: RequestForQuotation;
    onClose: () => void;
    onSent: () => void;
}

/**
 * Modal chọn nhiều NCC để gửi RFQ.
 */
export default function RfqSendModal({ rfq, onClose, onSent }: Props) {
    const [suppliers, setSuppliers] = useState<SupplierDropdownItem[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        void (async () => {
            setLoading(true);
            try {
                const list = await inventoryApi.getSuppliersDropdown();
                setSuppliers(list);
            } catch {
                toast.error('Lỗi tải NCC');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleSend = async () => {
        if (!selected.size) { toast.error('Chọn ít nhất 1 NCC'); return; }
        setSending(true);
        try {
            await rfqApi.sendToSuppliers(rfq.id, Array.from(selected));
            toast.success(`Đã gửi RFQ ${rfq.number} tới ${selected.size} NCC`);
            onSent();
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi gửi RFQ');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Gửi RFQ tới NCC</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
                </div>
                <div className="px-6 py-3 border-b border-gray-100 text-sm text-gray-600">
                    RFQ: <span className="font-mono font-semibold text-gray-900">{rfq.number}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                    {loading ? (
                        <div className="p-6 text-center text-gray-500">Đang tải...</div>
                    ) : !suppliers.length ? (
                        <div className="p-6 text-center text-gray-500">Chưa có NCC nào</div>
                    ) : (
                        <ul>
                            {suppliers.map(s => {
                                const isSelected = selected.has(s.id);
                                return (
                                    <li key={s.id}>
                                        <button
                                            type="button"
                                            onClick={() => toggle(s.id)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left hover:bg-gray-50 ${isSelected ? 'bg-red-50' : ''}`}
                                        >
                                            <div>
                                                <div className="font-medium text-gray-900">{s.name}</div>
                                                <div className="text-xs text-gray-500">Mã: {s.code}</div>
                                            </div>
                                            <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[var(--accent-primary,#e11d48)] bg-[var(--accent-primary,#e11d48)] text-white' : 'border-gray-300'}`}>
                                                {isSelected && <Check size={14} />}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-sm text-gray-600">Đã chọn: <b>{selected.size}</b></span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">Hủy</button>
                        <button
                            onClick={() => void handleSend()}
                            disabled={sending || !selected.size}
                            className="px-5 py-2 bg-[var(--accent-primary,#e11d48)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                        >
                            <Send size={14} />
                            {sending ? 'Đang gửi...' : 'Gửi'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
