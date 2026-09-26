import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowLeft, Wrench, PhoneCall } from 'lucide-react';
import { ROUTES } from '../../routes/route-paths';
import { repairPublicApi } from '../../api/repair/public';
import { getStatusColor, getWorkOrderStatusLabel, type WorkOrderStatus } from '../../api/repair/types';
import { RepairQuoteBreakdown } from '../../components/repair/repair-quote-breakdown';
import { breakdownFromTracked } from '../../components/repair/repair-quote-breakdown-adapters';
import { AnimatedSection } from '../../components/motion/animated-section';
import SEO from '../../components/SEO';

/**
 * Tra cứu tình trạng sửa chữa — KHÔNG cần đăng nhập (khách vãng lai).
 *
 * Chỉ theo dõi được phiếu (`WorkOrder.TicketNumber`, dạng `TKT-yyyyMMdd-XXXXXX`) — gap đã biết
 * (integration-requests-w3.md): đặt lịch qua `/booking` tạo `ServiceBooking`, chưa có mã ticket
 * để tra ở đây. Trang vẫn hướng khách "Gửi yêu cầu nhanh" (tạo WorkOrder trực tiếp) làm đường có
 * ticket tra được ngay hôm nay.
 */
export const RepairTrackingPage = () => {
    const [ticketNumber, setTicketNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [result, setResult] = useState<Awaited<ReturnType<typeof repairPublicApi.track>> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
        if (!ticketNumber.trim() || !phone.trim()) return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const data = await repairPublicApi.track(ticketNumber.trim(), phone.trim());
            setResult(data);
        } catch (err) {
            const apiErr = err as { response?: { status?: number; data?: { error?: string } } };
            setError(
                apiErr.response?.status === 404
                    ? 'Không tìm thấy phiếu sửa chữa khớp với mã và số điện thoại đã nhập.'
                    : apiErr.response?.data?.error || 'Không tra cứu được lúc này. Vui lòng thử lại sau.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen py-10">
            <SEO title="Tra cứu sửa chữa" description="Tra cứu tình trạng phiếu sửa chữa bằng mã phiếu và số điện thoại, không cần đăng nhập." />
            <div className="max-w-2xl mx-auto px-4">
                <Link to={ROUTES.REPAIR} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent mb-4">
                    <ArrowLeft size={14} /> Quay lại dịch vụ sửa chữa
                </Link>

                <AnimatedSection>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                                <Wrench size={20} />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900">Tra cứu tình trạng sửa chữa</h1>
                        </div>
                        <p className="text-sm text-gray-500 mb-6">
                            Nhập mã phiếu (VD: TKT-20260918-000123) và số điện thoại đã đăng ký để xem trạng thái.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mã phiếu sửa chữa</label>
                                <input
                                    value={ticketNumber}
                                    onChange={(e) => setTicketNumber(e.target.value)}
                                    placeholder="TKT-20260918-000123"
                                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm ${submitted && !ticketNumber.trim() ? 'border-red-400 bg-red-50/50' : 'border-gray-200'}`}
                                />
                                {submitted && !ticketNumber.trim() && <p className="text-red-500 text-xs mt-1">Vui lòng nhập mã phiếu.</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại</label>
                                <input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="09xxxxxxxx"
                                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm ${submitted && !phone.trim() ? 'border-red-400 bg-red-50/50' : 'border-gray-200'}`}
                                />
                                {submitted && !phone.trim() && <p className="text-red-500 text-xs mt-1">Vui lòng nhập số điện thoại.</p>}
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-accent hover:opacity-90 text-white font-semibold rounded-xl text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Search size={16} /> {loading ? 'Đang tra cứu...' : 'Tra cứu'}
                            </button>
                        </form>

                        {error && (
                            <div className="mt-5 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4">
                                {error}
                            </div>
                        )}

                        {result && (
                            <AnimatedSection>
                                <div className="mt-6 border-t border-gray-100 pt-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm text-gray-500">Mã phiếu</span>
                                        <span className="font-mono font-semibold text-gray-900">{result.ticketNumber}</span>
                                    </div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm text-gray-500">Thiết bị</span>
                                        <span className="font-medium text-gray-900">{result.deviceModel}</span>
                                    </div>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm text-gray-500">Trạng thái</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(result.status as WorkOrderStatus)}`}>
                                            {getWorkOrderStatusLabel(result.status as WorkOrderStatus)}
                                        </span>
                                    </div>
                                    {result.quote && (
                                        <div className="mb-4 rounded-xl border border-gray-100 p-4">
                                            <div className="mb-3 flex items-center justify-between">
                                                <span className="text-sm font-semibold text-gray-900">Báo giá {result.quote.quoteNumber}</span>
                                                <span className="text-xs text-gray-500">
                                                    Hiệu lực đến {new Date(result.quote.validUntil).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                                                </span>
                                            </div>
                                            <RepairQuoteBreakdown {...breakdownFromTracked(result.quote)} caption="Chi tiết báo giá" />
                                            {result.quote.status === 'Pending' && (
                                                <p className="mt-3 text-xs text-gray-500">
                                                    Đăng nhập tài khoản đã đặt lịch, vào "Phiếu sửa chữa của tôi" để đồng ý hoặc từ chối báo giá.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {result.timeline && result.timeline.length > 0 && (
                                        <ol className="space-y-3 mt-4">
                                            {result.timeline.map((t, i) => (
                                                <li key={i} className="text-sm flex gap-3">
                                                    <span className="w-2 h-2 mt-1.5 rounded-full bg-accent shrink-0" />
                                                    <div>
                                                        <p className="font-medium text-gray-900">{t.activity}</p>
                                                        <p className="text-gray-400 text-xs">{new Date(t.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
                                                        {t.description && <p className="text-gray-500 text-xs mt-0.5">{t.description}</p>}
                                                    </div>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </div>
                            </AnimatedSection>
                        )}
                    </div>
                </AnimatedSection>

                <div className="mt-4 text-center text-sm text-gray-400 flex items-center justify-center gap-1.5">
                    <PhoneCall size={14} /> Không tìm thấy phiếu? Gọi hotline để được hỗ trợ trực tiếp.
                </div>
            </div>
        </div>
    );
};

export default RepairTrackingPage;
