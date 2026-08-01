import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, RotateCcw, Clock, CheckCircle2, XCircle, Package,
    Search, Cog, Wallet, RefreshCw, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { salesApi, type ReturnRequestDetail, type ReturnStatus, type ReturnTimelineEvent } from '../../api/sales';
import { formatCurrency } from '../../utils/format';
import { useConfirm } from '../../context/ConfirmContext';
import { AnimatedSection } from '../../components/motion/animated-section';

// ============================================================================
// Chi tiết yêu cầu đổi/trả — /account/returns/:id
// ============================================================================

// Trạng thái mở rộng khớp backend Phase 07 (có thể có Inspecting/Processing)
type ExtendedStatus = ReturnStatus | 'Inspecting' | 'Processing';

interface StatusMeta {
    label: string;
    icon: JSX.Element;
    color: string;
    bg: string;
    ring: string;
}

const STATUS_META: Record<string, StatusMeta> = {
    Pending: {
        label: 'Chờ duyệt', icon: <Clock className="w-4 h-4" />,
        color: 'text-amber-700', bg: 'bg-amber-100', ring: 'bg-amber-500',
    },
    Approved: {
        label: 'Đã duyệt', icon: <CheckCircle2 className="w-4 h-4" />,
        color: 'text-blue-700', bg: 'bg-blue-100', ring: 'bg-blue-500',
    },
    Inspecting: {
        label: 'Kiểm hàng', icon: <Search className="w-4 h-4" />,
        color: 'text-indigo-700', bg: 'bg-indigo-100', ring: 'bg-indigo-500',
    },
    Processing: {
        label: 'Đang xử lý', icon: <Cog className="w-4 h-4" />,
        color: 'text-purple-700', bg: 'bg-purple-100', ring: 'bg-purple-500',
    },
    Refunded: {
        label: 'Đã hoàn tiền', icon: <Wallet className="w-4 h-4" />,
        color: 'text-emerald-700', bg: 'bg-emerald-100', ring: 'bg-emerald-500',
    },
    Completed: {
        label: 'Hoàn tất', icon: <CheckCircle2 className="w-4 h-4" />,
        color: 'text-green-700', bg: 'bg-green-100', ring: 'bg-green-500',
    },
    Cancelled: {
        label: 'Đã huỷ', icon: <XCircle className="w-4 h-4" />,
        color: 'text-gray-700', bg: 'bg-gray-100', ring: 'bg-gray-400',
    },
    Rejected: {
        label: 'Từ chối', icon: <XCircle className="w-4 h-4" />,
        color: 'text-red-700', bg: 'bg-red-100', ring: 'bg-red-500',
    },
};

const DEFAULT_TIMELINE_ORDER: ExtendedStatus[] = ['Pending', 'Approved', 'Inspecting', 'Processing', 'Completed'];

const statusMeta = (s: string): StatusMeta => STATUS_META[s] ?? STATUS_META.Pending;

const typeLabel = (t: string): string => {
    if (t === 'Refund') return 'Hoàn tiền';
    if (t === 'Exchange') return 'Đổi sản phẩm khác';
    if (t === 'Replace') return 'Đổi 1-1 cùng loại';
    return t;
};

const typeIcon = (t: string): JSX.Element => {
    if (t === 'Refund') return <Wallet className="w-4 h-4" />;
    if (t === 'Exchange') return <RefreshCw className="w-4 h-4" />;
    return <RotateCcw className="w-4 h-4" />;
};

// Xây timeline mặc định nếu backend không trả — hiển thị các bước đã đạt
const buildDefaultTimeline = (currentStatus: string, requestedAt?: string): ReturnTimelineEvent[] => {
    // Nếu Rejected/Cancelled → chỉ hiện 2 bước
    if (currentStatus === 'Rejected' || currentStatus === 'Cancelled') {
        return [
            { status: 'Pending' as ReturnStatus, label: STATUS_META.Pending.label, at: requestedAt },
            { status: currentStatus as ReturnStatus, label: statusMeta(currentStatus).label },
        ];
    }
    const currentIdx = DEFAULT_TIMELINE_ORDER.indexOf(currentStatus as ExtendedStatus);
    return DEFAULT_TIMELINE_ORDER.map((s, i) => ({
        status: s as ReturnStatus,
        label: STATUS_META[s].label,
        at: i === 0 ? requestedAt : undefined,
    })).slice(0, Math.max(currentIdx + 1, 1));
};

export const ReturnRequestDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [detail, setDetail] = useState<ReturnRequestDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCancelling, setIsCancelling] = useState(false);

    useEffect(() => {
        if (id) void load(id);
    }, [id]);

    const load = async (rid: string) => {
        try {
            setIsLoading(true);
            const d = await salesApi.orders.returns.getById(rid);
            setDetail(d);
        } catch (err) {
            const anyErr = err as { response?: { status?: number } };
            if (anyErr.response?.status === 404) {
                toast.error('Không tìm thấy yêu cầu');
            } else {
                toast.error('Không tải được chi tiết yêu cầu');
            }
            navigate('/account/orders');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!detail) return;
        const ok = await confirm({
            message: 'Huỷ yêu cầu đổi/trả này? Bạn có thể tạo yêu cầu mới sau.',
            variant: 'warning',
        });
        if (!ok) return;
        try {
            setIsCancelling(true);
            await salesApi.orders.returns.cancel(detail.id);
            toast.success('Đã huỷ yêu cầu');
            await load(detail.id);
        } catch (err) {
            const anyErr = err as { response?: { data?: { Error?: string } } };
            toast.error(anyErr.response?.data?.Error || 'Không huỷ được yêu cầu');
        } finally {
            setIsCancelling(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
            </div>
        );
    }

    if (!detail) return null;

    const timeline: ReturnTimelineEvent[] =
        detail.timeline && detail.timeline.length > 0
            ? detail.timeline
            : buildDefaultTimeline(detail.status, detail.requestedAt);

    const meta = statusMeta(detail.status);
    const isTerminal = ['Completed', 'Rejected', 'Cancelled', 'Refunded'].includes(detail.status);
    const canCancel = detail.status === 'Pending';

    return (
        <div className="bg-gray-50 min-h-screen py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <Link
                    to="/account/orders"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-accent text-sm font-medium mb-5 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại đơn hàng
                </Link>

                {/* Header */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                        <RotateCcw size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-gray-900">Yêu cầu #{detail.id.slice(0, 8).toUpperCase()}</h1>
                        <p className="text-gray-500 text-sm">
                            {detail.requestedAt ? new Date(detail.requestedAt).toLocaleString('vi-VN') : '—'}
                            {detail.orderNumber && <> · Đơn {detail.orderNumber}</>}
                        </p>
                    </div>
                    <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${meta.bg} ${meta.color}`}
                    >
                        {meta.icon}
                        {meta.label}
                    </span>
                </div>

                <div className="grid lg:grid-cols-3 gap-5">
                    {/* Left: Timeline + Details */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Timeline */}
                        <AnimatedSection>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h2 className="text-base font-bold text-gray-900 mb-5">Tiến độ xử lý</h2>
                                <div>
                                    {timeline.map((ev, idx) => {
                                        const m = statusMeta(ev.status);
                                        const isCurrent = ev.status === detail.status;
                                        return (
                                            <div key={`${ev.status}-${idx}`} className="flex gap-4 pb-6 last:pb-0 relative">
                                                {idx < timeline.length - 1 && (
                                                    <div className="absolute left-[19px] top-[40px] bottom-0 w-[2px] bg-gray-100" />
                                                )}
                                                <div
                                                    className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                                                        isCurrent ? m.ring : 'bg-emerald-500'
                                                    } text-white`}
                                                >
                                                    {m.icon}
                                                </div>
                                                <div className="pt-1.5">
                                                    <h4 className="font-semibold text-sm text-gray-900">{ev.label}</h4>
                                                    {ev.at && (
                                                        <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(ev.at).toLocaleString('vi-VN')}
                                                        </p>
                                                    )}
                                                    {ev.note && (
                                                        <p className="text-gray-500 text-xs mt-1">{ev.note}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </AnimatedSection>

                        {/* Details */}
                        <AnimatedSection delay={0.05}>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h2 className="text-base font-bold text-gray-900 mb-4">Thông tin yêu cầu</h2>
                                <div className="space-y-3 text-sm">
                                    <Row
                                        label="Loại yêu cầu"
                                        value={
                                            <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                                                {typeIcon(detail.type)}
                                                {typeLabel(detail.type)}
                                            </span>
                                        }
                                    />
                                    {detail.productName && (
                                        <Row
                                            label="Sản phẩm"
                                            value={
                                                <span className="flex items-center gap-2 text-gray-900 font-semibold">
                                                    <Package className="w-4 h-4 text-gray-400" />
                                                    {detail.productName}
                                                    {detail.quantity != null && detail.quantity > 1 && (
                                                        <span className="text-gray-500 font-normal"> · SL {detail.quantity}</span>
                                                    )}
                                                </span>
                                            }
                                        />
                                    )}
                                    {detail.unitPrice != null && (
                                        <Row label="Đơn giá" value={<span className="text-gray-900 font-semibold">{formatCurrency(detail.unitPrice)}</span>} />
                                    )}
                                    <Row label="Lý do" value={<span className="text-gray-900">{detail.reason}</span>} />
                                    {detail.description && (
                                        <Row label="Mô tả" value={<span className="text-gray-700 whitespace-pre-line">{detail.description}</span>} />
                                    )}
                                </div>

                                {/* Attachments */}
                                {detail.attachmentUrls && detail.attachmentUrls.length > 0 && (
                                    <div className="mt-5 pt-5 border-t border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-900 mb-3">Ảnh minh chứng</h3>
                                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                            {detail.attachmentUrls.map((url) => (
                                                <a
                                                    key={url}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                                                >
                                                    <img src={url} alt="Minh chứng" className="w-full h-full object-cover hover:scale-105 transition-transform" loading="lazy" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </AnimatedSection>

                        {/* Rejection reason */}
                        {detail.status === 'Rejected' && detail.rejectionReason && (
                            <AnimatedSection delay={0.1}>
                                <div className="bg-red-50 rounded-2xl border border-red-100 p-5 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-bold text-red-800 mb-1">Yêu cầu đã bị từ chối</p>
                                        <p className="text-red-700 whitespace-pre-line">{detail.rejectionReason}</p>
                                    </div>
                                </div>
                            </AnimatedSection>
                        )}
                    </div>

                    {/* Right: Summary sidebar */}
                    <div className="space-y-5">
                        {/* Exchange info */}
                        {detail.type === 'Exchange' && (detail.exchangeProductName || detail.exchangeProductId) && (
                            <AnimatedSection>
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-gray-900 mb-3">Sản phẩm đổi sang</h3>
                                    <p className="text-sm text-gray-900 font-semibold mb-2">
                                        {detail.exchangeProductName ?? detail.exchangeProductId}
                                    </p>
                                    {detail.priceDifference != null && detail.priceDifference !== 0 && (
                                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Chênh lệch</span>
                                            <span className={`font-bold ${detail.priceDifference > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {detail.priceDifference > 0
                                                    ? `+${formatCurrency(detail.priceDifference)}`
                                                    : formatCurrency(detail.priceDifference)}
                                            </span>
                                        </div>
                                    )}
                                    {detail.exchangeOrderId && (
                                        <Link
                                            to={`/account/orders/${detail.exchangeOrderId}`}
                                            className="mt-3 inline-block text-xs text-accent font-semibold hover:underline"
                                        >
                                            Xem đơn hàng mới
                                        </Link>
                                    )}
                                </div>
                            </AnimatedSection>
                        )}

                        {/* Refund info */}
                        {detail.type === 'Refund' && (detail.status === 'Refunded' || detail.status === 'Completed') && (
                            <AnimatedSection>
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="text-sm font-bold text-gray-900 mb-3">Thông tin hoàn tiền</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Số tiền hoàn</span>
                                            <span className="font-bold text-emerald-600">{formatCurrency(detail.refundAmount)}</span>
                                        </div>
                                        {detail.refundMethod && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Phương thức</span>
                                                <span className="text-gray-900">{detail.refundMethod}</span>
                                            </div>
                                        )}
                                        {detail.refundedAt && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Ngày hoàn</span>
                                                <span className="text-gray-900">{new Date(detail.refundedAt).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </AnimatedSection>
                        )}

                        {/* Actions */}
                        {canCancel && (
                            <AnimatedSection delay={0.1}>
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        disabled={isCancelling}
                                        className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {isCancelling ? 'Đang huỷ...' : 'Huỷ yêu cầu'}
                                    </button>
                                    <p className="text-xs text-gray-400 mt-2 text-center">
                                        Chỉ có thể huỷ khi yêu cầu còn ở trạng thái Chờ duyệt.
                                    </p>
                                </div>
                            </AnimatedSection>
                        )}

                        {isTerminal && detail.status !== 'Cancelled' && detail.status !== 'Rejected' && (
                            <AnimatedSection delay={0.1}>
                                <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-emerald-800">
                                        Yêu cầu đã được xử lý xong. Cảm ơn bạn đã tin tưởng Quang Hưởng Computer.
                                    </p>
                                </div>
                            </AnimatedSection>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
        <span className="text-gray-500 flex-shrink-0">{label}</span>
        <div className="text-right">{value}</div>
    </div>
);

export default ReturnRequestDetailPage;
