import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSearch, RefreshCw, Plus, Send, Eye, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AnimatedSection } from '../../../components/motion/animated-section';
import RfqCreateModal from '../../../components/inventory/rfq-create-modal';
import RfqSendModal from '../../../components/inventory/rfq-send-modal';
import { rfqApi } from '../../../api/inventory';
import type { RequestForQuotation, RfqStatus } from '../../../api/inventory';

const STATUS_META: Record<RfqStatus, { label: string; className: string }> = {
    Draft: { label: 'Nháp', className: 'bg-gray-100 text-gray-700' },
    Sent: { label: 'Đã gửi', className: 'bg-blue-100 text-blue-700' },
    ClosedForBidding: { label: 'Đã đóng', className: 'bg-purple-100 text-purple-700' },
    Awarded: { label: 'Đã chọn NCC', className: 'bg-emerald-100 text-emerald-700' },
    Cancelled: { label: 'Đã hủy', className: 'bg-red-100 text-red-700' },
};

export default function RfqPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState<RequestForQuotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<RfqStatus | 'all'>('all');
    const [showCreate, setShowCreate] = useState(false);
    const [sendTarget, setSendTarget] = useState<RequestForQuotation | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await rfqApi.getList(status);
            setItems(data);
        } catch (err) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Lỗi tải danh sách RFQ');
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => { void load(); }, [load]);

    return (
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <FileSearch size={22} className="text-white" />
                        </div>
                        Yêu cầu báo giá (RFQ)
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-[52px]">
                        Gửi RFQ cho nhiều NCC, so sánh giá và chọn NCC thắng để tạo PO tự động.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => void load()}
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Làm mới
                    </button>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent-primary,#e11d48)] text-white rounded-xl text-sm font-semibold hover:opacity-90"
                    >
                        <Plus size={16} />
                        Tạo RFQ
                    </button>
                </div>
            </div>

            <AnimatedSection className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <label className="text-sm text-gray-600 font-medium">Trạng thái:</label>
                <select
                    value={status}
                    onChange={e => setStatus(e.target.value as RfqStatus | 'all')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                    <option value="all">Tất cả</option>
                    {(Object.keys(STATUS_META) as RfqStatus[]).map(s => (
                        <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                </select>
            </AnimatedSection>

            <AnimatedSection className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" delay={0.05}>
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-gray-500">
                        <RefreshCw size={22} className="animate-spin mr-2" /> Đang tải...
                    </div>
                ) : !items.length ? (
                    <div className="text-center py-16">
                        <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">Chưa có RFQ nào</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Số RFQ</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Ngày tạo</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Hạn báo giá</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Số NCC</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Báo giá</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Trạng thái</th>
                                <th className="text-center px-4 py-3 font-semibold text-gray-600">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(rfq => (
                                <tr key={rfq.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{rfq.number}</td>
                                    <td className="px-4 py-3 text-center text-gray-700 text-xs">
                                        {new Date(rfq.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-700 text-xs">
                                        {rfq.dueDate ? new Date(rfq.dueDate).toLocaleDateString('vi-VN') : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-center">{rfq.supplierCount}</td>
                                    <td className="px-4 py-3 text-center">{rfq.quotationCount}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_META[rfq.status].className}`}>
                                            {STATUS_META[rfq.status].label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex justify-center gap-1.5">
                                            <button
                                                onClick={() => navigate(`/backoffice/rfq/${rfq.id}`)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold"
                                            >
                                                <Eye size={13} /> Chi tiết
                                            </button>
                                            {rfq.status === 'Draft' && (
                                                <button
                                                    onClick={() => setSendTarget(rfq)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold"
                                                >
                                                    <Send size={13} /> Gửi NCC
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </AnimatedSection>

            {showCreate && (
                <RfqCreateModal
                    onClose={() => setShowCreate(false)}
                    onCreated={id => { setShowCreate(false); void load(); navigate(`/backoffice/rfq/${id}`); }}
                />
            )}

            {sendTarget && (
                <RfqSendModal
                    rfq={sendTarget}
                    onClose={() => setSendTarget(null)}
                    onSent={() => { setSendTarget(null); void load(); }}
                />
            )}
        </div>
    );
}
