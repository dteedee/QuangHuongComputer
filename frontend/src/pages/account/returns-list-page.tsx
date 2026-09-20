import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, ChevronRight, Wallet, RefreshCw, Package } from 'lucide-react';
import { AccountLayout } from '../../layouts/account-layout';
import { salesApi, type ReturnRequest } from '../../api/sales';
import { formatCurrency } from '../../utils/format';

/**
 * `/tai-khoan/returns` — danh sách yêu cầu đổi/trả của khách đang đăng nhập.
 * `GET /sales/returns` (backend/Services/Sales/Endpoints/Returns/ReturnEndpoints.cs ~dòng 63),
 * gọi qua `salesApi.orders.returns.getList()` (đã sửa để trỏ đúng endpoint, không còn `/mine`).
 */

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
    Pending: { label: 'Chờ duyệt', className: 'text-amber-700 bg-amber-100' },
    Approved: { label: 'Đã duyệt', className: 'text-blue-700 bg-blue-100' },
    Inspecting: { label: 'Kiểm hàng', className: 'text-indigo-700 bg-indigo-100' },
    Processing: { label: 'Đang xử lý', className: 'text-purple-700 bg-purple-100' },
    Refunded: { label: 'Đã hoàn tiền', className: 'text-emerald-700 bg-emerald-100' },
    Completed: { label: 'Hoàn tất', className: 'text-green-700 bg-green-100' },
    Cancelled: { label: 'Đã huỷ', className: 'text-gray-700 bg-gray-100' },
    Rejected: { label: 'Từ chối', className: 'text-red-700 bg-red-100' },
};

const statusMeta = (s: string) => STATUS_LABEL[s] ?? { label: s, className: 'text-gray-700 bg-gray-100' };

const typeLabel = (t: string) => (t === 'Refund' ? 'Hoàn tiền' : t === 'Exchange' ? 'Đổi sản phẩm khác' : 'Đổi 1-1 cùng loại');
const typeIcon = (t: string) => (t === 'Refund' ? <Wallet size={14} /> : t === 'Exchange' ? <RefreshCw size={14} /> : <RotateCcw size={14} />);

export const ReturnsListPage = () => {
    const [items, setItems] = useState<ReturnRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const load = async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await salesApi.orders.returns.getList();
            setItems(data);
        } catch {
            setError('Không tải được danh sách yêu cầu đổi/trả');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void load(); }, []);

    return (
        <AccountLayout breadcrumb={[{ label: 'Đổi / trả hàng' }]}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Đổi / trả hàng</h1>
                    <p className="text-sm text-gray-500 mt-1">Danh sách các yêu cầu đổi/trả hàng bạn đã gửi.</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                    {isLoading ? (
                        <div className="p-5 space-y-3">
                            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />)}
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center">
                            <p className="text-sm text-red-600 mb-3">{error}</p>
                            <button onClick={load} className="text-sm font-semibold text-accent hover:underline cursor-pointer">Thử lại</button>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="p-10 text-center">
                            <RotateCcw size={36} className="text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 mb-4">Bạn chưa có yêu cầu đổi/trả nào.</p>
                            <Link to="/tai-khoan/orders" className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 cursor-pointer">
                                <Package size={15} /> Xem đơn hàng của tôi
                            </Link>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50">
                            {items.map((r) => {
                                const meta = statusMeta(r.status);
                                return (
                                    <li key={r.id}>
                                        <Link
                                            to={`/tai-khoan/returns/${r.id}`}
                                            className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                                                    {typeIcon(r.type)} {typeLabel(r.type)}
                                                    {r.orderNumber && <span className="text-gray-400 font-normal">· Đơn {r.orderNumber}</span>}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5 truncate">{r.reason}</p>
                                                {r.requestedAt && (
                                                    <p className="text-xs text-gray-400 mt-0.5">{new Date(r.requestedAt).toLocaleDateString('vi-VN')}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                {r.refundAmount > 0 && (
                                                    <span className="text-sm font-bold text-gray-900">{formatCurrency(r.refundAmount)}</span>
                                                )}
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${meta.className}`}>
                                                    {meta.label}
                                                </span>
                                                <ChevronRight size={16} className="text-gray-300" />
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </AccountLayout>
    );
};

export default ReturnsListPage;
