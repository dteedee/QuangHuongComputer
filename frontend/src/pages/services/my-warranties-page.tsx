import { Link } from 'react-router-dom';
import { ROUTES } from '../../routes/route-paths';
import { useQuery } from '@tanstack/react-query';
import { PlusCircle, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { warrantyPublicApi } from '../../api/warranty/public';
import type { ClaimStatus } from '../../api/warranty/types';
import { AnimatedSection } from '../../components/motion/animated-section';
import SEO from '../../components/SEO';

const STATUS_LABEL: Record<ClaimStatus, string> = {
    Pending: 'Đang chờ duyệt',
    Approved: 'Đã duyệt',
    InProgress: 'Đang xử lý',
    Resolved: 'Đã hoàn tất',
    Rejected: 'Đã từ chối',
};

const STATUS_COLOR: Record<ClaimStatus, string> = {
    Pending: 'bg-amber-50 text-amber-700',
    Approved: 'bg-blue-50 text-blue-700',
    InProgress: 'bg-blue-50 text-blue-700',
    Resolved: 'bg-emerald-50 text-emerald-700',
    Rejected: 'bg-red-50 text-red-700',
};

/**
 * `/tai-khoan/bao-hanh` — yêu cầu đăng nhập. Danh sách claim bảo hành của khách + CTA tạo mới.
 * D08/spec: "current claim CTA leads nowhere" — CTA ở đây trỏ thẳng tới `warranty-claim-page`.
 */
export const MyWarrantiesPage = () => {
    const { data: claims, isLoading, error } = useQuery({
        queryKey: ['my-warranty-claims'],
        queryFn: warrantyPublicApi.getMyClaims,
    });

    return (
        <div className="bg-gray-50 min-h-screen py-8">
            <SEO title="Bảo hành của tôi" noindex />
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">Bảo hành của tôi</h1>
                    <Link
                        to={ROUTES.WARRANTY_CLAIM_NEW}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white font-semibold rounded-xl text-sm hover:opacity-90"
                    >
                        <PlusCircle size={16} /> Tạo yêu cầu bảo hành
                    </Link>
                </div>

                {isLoading && (
                    <div className="flex items-center gap-2 text-gray-400 py-16 justify-center">
                        <Loader2 className="animate-spin" size={20} /> Đang tải...
                    </div>
                )}

                {!isLoading && error && (
                    <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-5 flex items-start gap-3">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                        <p className="text-sm">Không tải được danh sách bảo hành. Vui lòng thử lại sau hoặc liên hệ CSKH.</p>
                    </div>
                )}

                {!isLoading && !error && (!claims || claims.length === 0) && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                        <ShieldCheck className="mx-auto text-gray-300 mb-3" size={40} />
                        <p className="text-gray-500 mb-1">Bạn chưa có yêu cầu bảo hành nào.</p>
                        <p className="text-sm text-gray-400">Tạo yêu cầu mới từ sản phẩm còn bảo hành trong đơn hàng của bạn.</p>
                    </div>
                )}

                {!isLoading && !error && claims && claims.length > 0 && (
                    <div className="space-y-3">
                        {claims.map((c) => (
                            <AnimatedSection key={c.id}>
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
                                    <div>
                                        <p className="font-semibold text-gray-900">{c.productName || c.serialNumber}</p>
                                        <p className="text-sm text-gray-500 mt-0.5">S/N: {c.serialNumber}</p>
                                        <p className="text-sm text-gray-500 line-clamp-1">{c.issueDescription}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Ngày gửi: {new Date(c.filedDate).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${STATUS_COLOR[c.status]}`}>
                                        {STATUS_LABEL[c.status]}
                                    </span>
                                </div>
                            </AnimatedSection>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyWarrantiesPage;
