
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warrantyApi, ResolutionPreference } from '../api/warranty';
import type { WarrantyClaim, WarrantyCoverage } from '../api/warranty';

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
        createClaim.mutate({
            serialNumber,
            issueDescription,
            preferredResolution
        });
    };

    const handleLookup = async () => {
        setCoverageInfo(null);
        setErrorMessage('');

        try {
            if (lookupMode === 'serial') {
                if (!lookupSerial.trim()) {
                    setErrorMessage('Vui lòng nhập số Serial');
                    return;
                }
                const data = await warrantyApi.lookupCoverage(lookupSerial);
                setCoverageInfo(data);
            } else {
                if (!lookupInvoice.trim()) {
                    setErrorMessage('Vui lòng nhập số hóa đơn');
                    return;
                }
                const data = await warrantyApi.lookupByInvoice(lookupInvoice);
                setCoverageInfo(data);
            }
        } catch (error: any) {
            setErrorMessage(error.message || 'Không tìm thấy thông tin bảo hành');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="container mx-auto px-4 py-32 text-center animate-fade-in font-sans">
                <div className="bg-white p-12 max-w-lg mx-auto rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100/50">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Vui lòng <span className="text-accent">Đăng nhập</span></h2>
                    <p className="text-gray-500 text-lg mb-10">Bạn cần đăng nhập để sử dụng dịch vụ bảo hành và gửi yêu cầu hỗ trợ.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-7xl font-sans">
            <h2 className="text-3xl font-bold text-gray-900 mb-10 tracking-tight">Dịch vụ <span className="text-accent">Bảo hành</span></h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coverage Lookup */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 h-fit">
                    <h3 className="text-xl font-bold text-emerald-600 mb-6 tracking-tight">Tra cứu thông tin bảo hành</h3>
                    <div className="space-y-5">
                        {/* Mode Toggle */}
                        <div className="flex gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                            <button
                                onClick={() => setLookupMode('serial')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${lookupMode === 'serial' ? 'bg-white text-emerald-600 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Theo Serial
                            </button>
                            <button
                                onClick={() => setLookupMode('invoice')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${lookupMode === 'invoice' ? 'bg-white text-emerald-600 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Theo Hóa đơn
                            </button>
                        </div>

                        {/* Input Field */}
                        {lookupMode === 'serial' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Số Serial (S/N)</label>
                                <input
                                    value={lookupSerial}
                                    onChange={e => setLookupSerial(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-gray-900 transition-all outline-none"
                                    placeholder="Ví dụ: SN123456"
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Số Hóa đơn</label>
                                <input
                                    value={lookupInvoice}
                                    onChange={e => setLookupInvoice(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-gray-900 transition-all outline-none"
                                    placeholder="Ví dụ: ORD-20260120-001"
                                />
                            </div>
                        )}

                        <button
                            onClick={handleLookup}
                            className="w-full py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 active:scale-95 text-sm"
                        >
                            Kiểm tra trạng thái
                        </button>

                        {/* Error Message */}
                        {errorMessage && lookupMode && (
                            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                <p className="text-red-700 font-medium text-sm">{errorMessage}</p>
                            </div>
                        )}

                        {/* Coverage Info */}
                        {coverageInfo && (
                            <div className="mt-8 space-y-4">
                                {Array.isArray(coverageInfo) ? (
                                    coverageInfo.map((info, index) => (
                                        <div key={index} className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-500 font-medium">Serial:</span>
                                                    <span className="text-gray-900 font-bold">{info.serialNumber}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-500 font-medium">Trạng thái:</span>
                                                    <span className={`font-semibold px-2 py-0.5 rounded ${info.isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                                        {info.isValid ? 'Còn hạn' : 'Hết hạn'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-500 font-medium">Hết hạn:</span>
                                                    <span className="text-gray-900 font-medium">{new Date(info.expirationDate).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                                {info.claimHistory && info.claimHistory.length > 0 && (
                                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                                        <p className="text-xs font-semibold text-gray-500 mb-3">Lịch sử bảo hành:</p>
                                                        <div className="space-y-3">
                                                            {info.claimHistory.map((claim, idx) => (
                                                                <div key={idx} className="text-sm flex flex-col gap-1.5 p-3 bg-gray-50 rounded-xl">
                                                                    <div className="flex justify-between items-start gap-2">
                                                                        <span className="text-gray-700 leading-relaxed text-xs">{claim.issueDescription.substring(0, 60)}{claim.issueDescription.length > 60 ? '...' : ''}</span>
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${claim.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                                                                            claim.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                                                                'bg-red-100 text-red-700'
                                                                            }`}>
                                                                            {claim.status}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500 font-medium">Serial:</span>
                                                <span className="text-gray-900 font-bold">{coverageInfo.serialNumber}</span>
                                            </div>
                                            {coverageInfo.orderNumber && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-500 font-medium">Hóa đơn:</span>
                                                    <span className="text-gray-900 font-medium">{coverageInfo.orderNumber}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500 font-medium">Trạng thái:</span>
                                                <span className={`font-semibold px-2 py-0.5 rounded ${coverageInfo.isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                                    {coverageInfo.isValid ? 'Còn hạn' : 'Hết hạn'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500 font-medium">Ngày mua:</span>
                                                <span className="text-gray-900 font-medium">{new Date(coverageInfo.purchaseDate).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500 font-medium">Hết hạn:</span>
                                                <span className="text-gray-900 font-medium">{new Date(coverageInfo.expirationDate).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                            {coverageInfo.claimHistory && coverageInfo.claimHistory.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-gray-100">
                                                    <p className="text-xs font-semibold text-gray-500 mb-3">Lịch sử bảo hành:</p>
                                                    <div className="space-y-3">
                                                        {coverageInfo.claimHistory.map((claim, idx) => (
                                                            <div key={idx} className="text-sm p-3 bg-gray-50 rounded-xl">
                                                                <div className="flex justify-between items-start mb-2 gap-2">
                                                                    <span className="text-gray-700 leading-relaxed text-xs">{claim.issueDescription}</span>
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${claim.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                                                                        claim.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                                                            'bg-red-100 text-red-700'
                                                                        }`}>
                                                                        {claim.status}
                                                                    </span>
                                                                </div>
                                                                <p className="text-gray-400 text-xs">
                                                                    {new Date(claim.filedDate).toLocaleDateString('vi-VN')}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* File Claim */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 h-fit">
                    <h3 className="text-xl font-bold text-orange-600 mb-6 tracking-tight">Gửi yêu cầu bảo hành</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Số Serial (S/N)</label>
                            <input
                                value={serialNumber}
                                onChange={e => setSerialNumber(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-gray-900 transition-all outline-none"
                                placeholder="Ví dụ: SN123456"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả tình trạng lỗi</label>
                            <textarea
                                value={issueDescription}
                                onChange={e => setIssueDescription(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-gray-900 transition-all outline-none min-h-[140px] resize-none"
                                placeholder="Vui lòng mô tả chi tiết lỗi sản phẩm đang gặp phải..."
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phương thức xử lý mong muốn</label>
                            <select
                                value={preferredResolution}
                                onChange={e => setPreferredResolution(e.target.value as ResolutionPreference)}
                                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-gray-900 transition-all outline-none"
                            >
                                <option value={ResolutionPreference.Repair}>Sửa chữa</option>
                                <option value={ResolutionPreference.Replace}>Đổi mới</option>
                                <option value={ResolutionPreference.Refund}>Hoàn tiền</option>
                            </select>
                        </div>
                        {success && <p className="text-emerald-600 text-sm font-medium">Đã gửi yêu cầu thành công!</p>}
                        {errorMessage && !success && (
                            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                <p className="text-red-700 font-medium text-sm">{errorMessage}</p>
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={createClaim.isPending}
                            className="w-full py-3.5 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition shadow-md shadow-orange-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {createClaim.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
                        </button>
                    </form>
                </div>

                {/* Claims History */}
                <div className="lg:col-span-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">Yêu cầu của bạn</h3>
                    {isLoading ? (
                        <div className="text-center text-gray-500 py-10">Đang tải dữ liệu...</div>
                    ) : claims?.length === 0 ? (
                        <div className="bg-white py-12 px-6 rounded-3xl border border-gray-100 shadow-sm text-center text-gray-500">
                            Chưa có yêu cầu nào.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {claims?.map(claim => (
                                <div key={claim.id} className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all shadow-sm">
                                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-50">
                                        <div>
                                            <h4 className="text-base font-bold text-gray-900">SN: {claim.serialNumber}</h4>
                                            <p className="text-xs text-gray-500 mt-1">Gửi ngày: {new Date(claim.filedDate).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${claim.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            claim.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                                claim.status === 'Approved' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                            {claim.status === 'Resolved' ? 'Đã giải quyết' :
                                                claim.status === 'Rejected' ? 'Bị từ chối' :
                                                    claim.status === 'Approved' ? 'Đã chấp nhận' :
                                                        claim.status === 'Pending' ? 'Chờ xử lý' : claim.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed">{claim.issueDescription}</p>
                                    {claim.resolutionNotes && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-xl text-sm text-gray-600 border border-gray-100">
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
    );
};

