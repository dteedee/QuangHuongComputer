import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import client from '../../api/client';

// D08 (binding): policy pages must show a real, live matrix — never a hardcoded number — because
// warranty months and return-fee percentages are config the shop can change without a deploy.
// Both endpoints are anonymous/public; no PII, no auth. Not moved into a shared `api/` module
// (sales + warranty are both owned by other tracks) — a plain `client.get` here stays inside this
// track's file ownership (`components/policy/**`) while still using the one shared axios instance.

interface WarrantyPolicyRow {
    categoryId: string | null;
    provider: 'Manufacturer' | 'Store';
    durationMonths: number;
    name: string;
    scope?: string;
    exclusions?: string;
}

interface WarrantyMatrixResponse {
    policies: WarrantyPolicyRow[];
    version: string;
}

interface ReturnPolicyRow {
    id: string;
    name: string;
    categoryId: string | null;
    daysForReturn: number;
    daysForExchange: number;
    daysForDefectReplace: number;
    restockingFeePercent: number;
    missingAccessoriesFeePercent: number;
    allowOpenedBoxReturn: boolean;
    daysForStatutoryReturn: number;
}

interface ReturnReasonRow {
    code: string;
    label: string;
    hasDeadline: boolean;
    days: number;
    feePercentIntact: number;
    feePercentUsedGood: number;
    feePercentMissingAccessories: number;
    requiresManagerApproval: boolean;
    routesToWarranty: boolean;
}

interface ReturnMatrixResponse {
    policies: ReturnPolicyRow[];
    reasons: ReturnReasonRow[];
}

const fmtPercent = (n: number) => `${n}%`;

function WarrantyMatrix() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['public-warranty-policy-matrix'],
        queryFn: async () => (await client.get<WarrantyMatrixResponse>('/warranty/policies/public-matrix')).data,
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return <div className="flex items-center gap-2 text-sm text-gray-400 py-6"><Loader2 size={16} className="animate-spin" /> Đang tải bảng thời hạn bảo hành...</div>;
    }
    if (error || !data || data.policies.length === 0) {
        return <p className="text-sm text-gray-500 py-4">Chưa tải được bảng thời hạn bảo hành theo ngành hàng. Vui lòng liên hệ CSKH để được tư vấn chính xác.</p>;
    }

    return (
        <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Bảng thời hạn bảo hành theo ngành hàng</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="text-left px-4 py-2.5 font-semibold">Chính sách</th>
                            <th className="text-left px-4 py-2.5 font-semibold">Đơn vị bảo hành</th>
                            <th className="text-right px-4 py-2.5 font-semibold">Thời hạn</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.policies.map((p, i) => (
                            <tr key={i}>
                                <td className="px-4 py-2.5 text-gray-800">{p.name}</td>
                                <td className="px-4 py-2.5 text-gray-500">{p.provider === 'Manufacturer' ? 'Nhà sản xuất' : 'Quang Hưởng Computer'}</td>
                                <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{p.durationMonths} tháng</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">Phiên bản dữ liệu: {data.version}. Thời hạn cụ thể theo sản phẩm hiển thị tại trang chi tiết sản phẩm.</p>
        </div>
    );
}

function ReturnMatrix() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['public-return-policy-matrix'],
        queryFn: async () => (await client.get<ReturnMatrixResponse>('/sales/return-policies/public-matrix')).data,
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return <div className="flex items-center gap-2 text-sm text-gray-400 py-6"><Loader2 size={16} className="animate-spin" /> Đang tải ma trận lý do đổi trả...</div>;
    }
    if (error || !data || data.reasons.length === 0) {
        return <p className="text-sm text-gray-500 py-4">Chưa tải được ma trận lý do đổi trả. Vui lòng liên hệ CSKH để được tư vấn chính xác.</p>;
    }

    return (
        <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Ma trận lý do đổi trả</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="text-left px-4 py-2.5 font-semibold">Lý do</th>
                            <th className="text-right px-4 py-2.5 font-semibold">Hạn xử lý</th>
                            <th className="text-right px-4 py-2.5 font-semibold">Phí (hàng nguyên vẹn)</th>
                            <th className="text-left px-4 py-2.5 font-semibold">Nhóm</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.reasons.map((r) => (
                            <tr key={r.code}>
                                <td className="px-4 py-2.5 text-gray-800">{r.label}</td>
                                <td className="px-4 py-2.5 text-right text-gray-500">{r.hasDeadline ? `${r.days} ngày` : 'Trong thời hạn bảo hành'}</td>
                                <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmtPercent(r.feePercentIntact)}</td>
                                <td className="px-4 py-2.5">
                                    <span className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full ${r.feePercentIntact === 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                        {r.feePercentIntact === 0 ? 'Luật định — miễn phí' : 'Nhập lại tự nguyện'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function PolicyMatrixTable({ kind }: { kind: 'warranty' | 'return' }) {
    return kind === 'warranty' ? <WarrantyMatrix /> : <ReturnMatrix />;
}

export default PolicyMatrixTable;
