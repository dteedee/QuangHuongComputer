
import { useState } from 'react';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warrantyApi, ResolutionPreference } from '../api/warranty';
import type { WarrantyClaim, WarrantyCoverage } from '../api/warranty';
import { ShieldCheck, Search, AlertCircle } from 'lucide-react';

export const WarrantyPage = () => {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const [serialNumber, setSerialNumber] = useState('');
    const [issueDescription, setIssueDescription] = useState('');
    const [preferredResolution, setPreferredResolution] = useState<ResolutionPreference>(ResolutionPreference.Repair);
    const [success, setSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [lookupSerial, setLookupSerial] = useState('');
    const [lookupInvoice, setLookupInvoice] = useState('');
    const [lookupMode, setLookupMode] = useState<'serial' | 'invoice'>('serial');
    const [coverageInfo, setCoverageInfo] = useState<WarrantyCoverage | WarrantyCoverage[] | null>(null);

    const { data: claims, isLoading } = useQuery<WarrantyClaim[]>({
        queryKey: ['warranty-claims'],
        queryFn: warrantyApi.getMyClaims,
        enabled: isAuthenticated
    });

    const createClaim = useMutation({
        mutationFn: warrantyApi.createClaim,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warranty-claims'] });
            setSuccess(true);
            setErrorMessage('');
            setSerialNumber('');
            setIssueDescription('');
            setPreferredResolution(ResolutionPreference.Repair);
            setTimeout(() => setSuccess(false), 3000);
        },
        onError: (error: any) => {
            const message = error.response?.data?.Message || error.message || 'Có lỗi xảy ra khi gửi yêu cầu';
            setErrorMessage(message);
            setSuccess(false);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!serialNumber.trim()) {
            setErrorMessage('Vui lòng nhập số Serial');
            return;
        }
        if (!issueDescription.trim()) {
            setErrorMessage('Vui lòng mô tả lỗi');
            return;
        }
        createClaim.mutate({ serialNumber, issueDescription, preferredResolution });
    };

    const handleLookup = async () => {
        setCoverageInfo(null);
        setErrorMessage('');
        try {
            if (lookupMode === 'serial') {
                if (!lookupSerial.trim()) { setErrorMessage('Vui lòng nhập số Serial'); return; }
                const data = await warrantyApi.lookupCoverage(lookupSerial);
                setCoverageInfo(data);
            } else {
                if (!lookupInvoice.trim()) { setErrorMessage('Vui lòng nhập số hóa đơn'); return; }
                const data = await warrantyApi.lookupByInvoice(lookupInvoice);
                setCoverageInfo(data);
            }
        } catch (error: any) {
            setErrorMessage(error.message || 'Không tìm thấy thông tin bảo hành');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="bg-gray-50 min-h-screen py-8 font-sans">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="max-w-md mx-auto bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
                        <div className="w-14 h-14 bg-red-50 text-accent rounded-xl flex items-center justify-center mx-auto mb-5">
                            <ShieldCheck size={28} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Vui lòng đăng nhập</h2>
                        <p className="text-gray-500 text-sm">Bạn cần đăng nhập để sử dụng dịch vụ bảo hành và gửi yêu cầu hỗ trợ.</p>
                    </div>
                </div>
            </div>
        );
    }

    const claimStatusLabel = (status: string) => {
        const map: Record<string, string> = {
            Resolved: 'Đã giải quyết', Rejected: 'Bị từ chối',
            Approved: 'Đã chấp nhận', Pending: 'Chờ xử lý'
        };
        return map[status] || status;
    };

    const claimStatusClass = (status: string) => {
        if (status === 'Resolved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (status === 'Rejected') return 'bg-red-50 text-red-700 border-red-200';
        if (status === 'Approved') return 'bg-blue-50 text-blue-700 border-blue-200';
        return 'bg-amber-50 text-amber-700 border-amber-200';
    };

    const coverageStatusClass = (isValid: boolean) =>
        isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700';

    const renderCoverageCard = (info: WarrantyCoverage, key?: number) => (
        <div key={key} className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
                <span className="text-gray-500">Serial:</span>
                <span className="font-semibold text-gray-900">{info.serialNumber}</span>
            </div>
            {(info as any).orderNumber && (
                <div className="flex justify-between items-center">
                    <span className="text-gray-500">Hóa đơn:</span>
                    <span className="font-medium text-gray-900">{(info as any).orderNumber}</span>
                </div>
            )}
            <div className="flex justify-between items-center">
                <span className="text-gray-500">Trạng thái:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${coverageStatusClass(info.isValid)}`}>
                    {info.isValid ? 'Còn hạn' : 'Hết hạn'}
                </span>
            </div>
            {(info as any).purchaseDate && (
                <div className="flex justify-between items-center">
                    <span className="text-gray-500">Ngày mua:</span>
                    <span className="text-gray-900">{new Date((info as any).purchaseDate).toLocaleDateString('vi-VN')}</span>
                </div>
            )}
            <div className="flex justify-between items-center">
                <span className="text-gray-500">Hết hạn:</span>
                <span className="text-gray-900">{new Date(info.expirationDate).toLocaleDateString('vi-VN')}</span>
            </div>
            {info.claimHistory && info.claimHistory.length > 0 && (
                <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Lịch sử bảo hành:</p>
                    <div className="space-y-2">
                        {info.claimHistory.map((claim, idx) => (
                            <div key={idx} className="flex justify-between items-start gap-2 bg-white rounded-lg p-2.5 border border-gray-100">
                                <span className="text-gray-600 text-xs leading-relaxed line-clamp-2">{claim.issueDescription}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${
                                    claim.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                                    claim.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                    {claim.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="bg-gray-50 min-h-screen py-8 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Dịch vụ bảo hành</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Coverage Lookup */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 h-fit">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                                <Search size={18} />
                            </div>
                            <h3 className="font-bold text-gray-900">Tra cứu bảo hành</h3>
                        </div>

                        <div className="space-y-4">
                            {/* Mode Toggle */}
                            <div className="flex gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-100">
                                <button
                                    onClick={() => setLookupMode('serial')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${lookupMode === 'serial' ? 'bg-white text-emerald-600 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Theo Serial
                                </button>
                                <button
                                    onClick={() => setLookupMode('invoice')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${lookupMode === 'invoice' ? 'bg-white text-emerald-600 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Theo Hóa đơn
                                </button>
                            </div>

                            {lookupMode === 'serial' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Số Serial (S/N)</label>
                                    <input
                                        value={lookupSerial}
                                        onChange={e => setLookupSerial(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-sm"
                                        placeholder="Ví dụ: SN123456"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Số Hóa đơn</label>
                                    <input
                                        value={lookupInvoice}
                                        onChange={e => setLookupInvoice(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-sm"
                                        placeholder="Ví dụ: ORD-20260120-001"
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleLookup}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all text-sm cursor-pointer"
                            >
                                Kiểm tra trạng thái
                            </button>

                            {errorMessage && !success && (
                                <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2">
                                    <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-red-700 text-sm">{errorMessage}</p>
                                </div>
                            )}

                            {coverageInfo && (
                                <div className="space-y-3 pt-1">
                                    {Array.isArray(coverageInfo)
                                        ? coverageInfo.map((info, index) => renderCoverageCard(info, index))
                                        : renderCoverageCard(coverageInfo)
                                    }
                                </div>
                            )}
                        </div>
                    </div>

                    {/* File Claim */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 h-fit">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-9 h-9 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center">
                                <ShieldCheck size={18} />
                            </div>
                            <h3 className="font-bold text-gray-900">Gửi yêu cầu bảo hành</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Số Serial (S/N)</label>
                                <input
                                    value={serialNumber}
                                    onChange={e => setSerialNumber(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-sm"
                                    placeholder="Ví dụ: SN123456"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mô tả tình trạng lỗi</label>
                                <textarea
                                    value={issueDescription}
                                    onChange={e => setIssueDescription(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-sm min-h-[120px] resize-none"
                                    placeholder="Vui lòng mô tả chi tiết lỗi sản phẩm đang gặp phải..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phương thức xử lý mong muốn</label>
                                <SearchableSelect
                                    value={preferredResolution}
                                    onChange={(val) => setPreferredResolution(val as ResolutionPreference)}
                                    options={[
                                        { value: ResolutionPreference.Repair, label: 'Sửa chữa' },
                                        { value: ResolutionPreference.Replace, label: 'Đổi mới' },
                                        { value: ResolutionPreference.Refund, label: 'Hoàn tiền' },
                                    ]}
                                    placeholder="Chọn phương thức"
                                />
                            </div>

                            {success && (
                                <p className="text-emerald-600 text-sm font-medium">Đã gửi yêu cầu thành công!</p>
                            )}
                            {errorMessage && !success && (
                                <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2">
                                    <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-red-700 text-sm">{errorMessage}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={createClaim.isPending}
                                className="w-full py-2.5 bg-accent hover:bg-[#b00014] text-white font-semibold rounded-xl transition-all text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {createClaim.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
                            </button>
                        </form>
                    </div>

                    {/* Claims History */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Yêu cầu của bạn</h3>
                        {isLoading ? (
                            <div className="text-center text-gray-500 py-10 text-sm">Đang tải dữ liệu...</div>
                        ) : claims?.length === 0 ? (
                            <div className="bg-white py-10 px-6 rounded-xl border border-gray-100 shadow-sm text-center text-gray-500 text-sm">
                                Chưa có yêu cầu nào.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {claims?.map(claim => (
                                    <div key={claim.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-gray-200 transition-all">
                                        <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-50">
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900">SN: {claim.serialNumber}</h4>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Gửi ngày: {new Date(claim.filedDate).toLocaleDateString('vi-VN')}
                                                </p>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${claimStatusClass(claim.status)}`}>
                                                {claimStatusLabel(claim.status)}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 text-sm leading-relaxed">{claim.issueDescription}</p>
                                        {claim.resolutionNotes && (
                                            <div className="mt-3 p-3 bg-gray-50 rounded-xl text-sm text-gray-600 border border-gray-100">
                                                <strong className="text-gray-900 block mb-1">Giải quyết:</strong>
                                                {claim.resolutionNotes}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
