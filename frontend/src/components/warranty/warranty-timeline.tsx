import { CheckCircle2, XCircle, Building2, Store, Clock, ShieldOff } from 'lucide-react';
import type { PublicWarrantyLookupResult, PublicWarrantyEntry } from '../../api/warranty';

/**
 * Hiển thị kết quả tra cứu bảo hành công khai.
 * KHÔNG hiển thị PII (tên/SĐT/địa chỉ chủ máy) — chỉ:
 *  - Tên sản phẩm (ngắn gọn)
 *  - Provider (Manufacturer/Store)
 *  - Còn hạn / hết hạn + ngày hết hạn
 *  - Trạng thái claim đang xử lý (nếu có)
 */

interface WarrantyTimelineProps {
    result: PublicWarrantyLookupResult;
}

const providerMeta = {
    Manufacturer: {
        label: 'Bảo hành hãng',
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: <Building2 className="w-4 h-4" />,
    },
    Store: {
        label: 'Bảo hành shop',
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: <Store className="w-4 h-4" />,
    },
} as const;

const formatDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch {
        return iso;
    }
};

const remainingDays = (iso: string): number => {
    const now = Date.now();
    const target = new Date(iso).getTime();
    if (Number.isNaN(target)) return 0;
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};

const WarrantyCard = ({ entry }: { entry: PublicWarrantyEntry }) => {
    const meta = providerMeta[entry.provider];
    const days = remainingDays(entry.expiresAt);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${meta.badge}`}>
                    {meta.icon}
                    {meta.label}
                </div>
                <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        entry.isValid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                >
                    {entry.isValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {entry.isValid ? 'Còn hạn' : 'Hết hạn'}
                </div>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-gray-500">Ngày hết hạn</span>
                    <span className="font-semibold text-gray-900">{formatDate(entry.expiresAt)}</span>
                </div>
                {entry.warrantyPeriodMonths != null && (
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Thời hạn</span>
                        <span className="text-gray-700">{entry.warrantyPeriodMonths} tháng</span>
                    </div>
                )}
                {entry.isValid && days >= 0 && (
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Còn lại</span>
                        <span className={`font-semibold ${days <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {days} ngày
                        </span>
                    </div>
                )}
            </div>

            {entry.activeClaim && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Yêu cầu đang xử lý
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span className="font-medium">Trạng thái: {entry.activeClaim.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Gửi ngày {formatDate(entry.activeClaim.filedDate)}
                        {entry.activeClaim.estimatedCompletionDate && (
                            <> · Dự kiến hoàn tất {formatDate(entry.activeClaim.estimatedCompletionDate)}</>
                        )}
                    </p>
                </div>
            )}
        </div>
    );
};

export const WarrantyTimeline = ({ result }: WarrantyTimelineProps) => {
    if (!result.found || result.warranties.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
                    <ShieldOff className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Không tìm thấy bảo hành</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                    Vui lòng kiểm tra lại thông tin đã nhập. Nếu cần trợ giúp, liên hệ tổng đài Quang Hưởng Computer.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {result.productName && (
                <div className="bg-gradient-to-r from-accent/5 to-transparent rounded-2xl border border-accent/10 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sản phẩm</p>
                    <p className="font-bold text-gray-900">{result.productName}</p>
                </div>
            )}

            {result.warranties.map((entry, idx) => (
                <WarrantyCard key={`${entry.provider}-${idx}`} entry={entry} />
            ))}
        </div>
    );
};

export default WarrantyTimeline;
