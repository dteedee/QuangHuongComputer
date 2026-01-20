
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warrantyApi, type WarrantyClaim, type WarrantyCoverage, ResolutionPreference } from '../api/warranty';

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
                <div className="bg-white p-16 max-w-2xl mx-auto rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-50">
                    <h2 className="text-3xl font-black text-gray-900 mb-4 uppercase italic tracking-tighter">Vui lòng <span className="text-[#D70018]">Đăng nhập</span></h2>
                    <p className="text-gray-500 font-medium mb-10 italic">Bạn cần đăng nhập để sử dụng dịch vụ bảo hành và gửi yêu cầu hỗ trợ.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-7xl font-sans">
            <h2 className="text-4xl font-black text-gray-900 mb-12 uppercase italic tracking-tighter">Dịch vụ <span className="text-[#D70018]">Bảo hành</span></h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Coverage Lookup */}
                <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-gray-200/50 border border-gray-100 h-fit">
                    <h3 className="text-xl font-black text-emerald-600 mb-6 uppercase italic tracking-tighter">Tra cứu bảo hành</h3>
                    <div className="space-y-4">
                        {/* Mode Toggle */}
                        <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
                            <button
                                onClick={() => setLookupMode('serial')}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition ${lookupMode === 'serial' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                Theo Serial
                            </button>
                            <button
                                onClick={() => setLookupMode('invoice')}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition ${lookupMode === 'invoice' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                Theo Hóa đơn
                            </button>
                        </div>

                        {/* Input Field */}
                        {lookupMode === 'serial' ? (
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Số Serial (S/N)</label>
                                <input
                                    value={lookupSerial}
                                    onChange={e => setLookupSerial(e.target.value)}
                                    className="w-full px-6 py-4 rounded-xl bg-gray-50 border border-transparent focus:border-[#D70018] text-gray-900 font-bold focus:outline-none transition-all shadow-inner"
                                    placeholder="Ví dụ: SN123456"
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Số Hóa đơn</label>
                                <input
                                    value={lookupInvoice}
                                    onChange={e => setLookupInvoice(e.target.value)}
                                    className="w-full px-6 py-4 rounded-xl bg-gray-50 border border-transparent focus:border-[#D70018] text-gray-900 font-bold focus:outline-none transition-all shadow-inner"
                                    placeholder="Ví dụ: ORD-20260120-001"
                                />
                            </div>
                        )}

                        <button
                            onClick={handleLookup}
                            className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 uppercase tracking-widest text-[10px] active:scale-95"
                        >
                            Kiểm tra trạng thái
                        </button>

                        {/* Error Message */}
                        {errorMessage && lookupMode && (
                            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                <p className="text-[#D70018] font-bold text-xs tracking-tighter">{errorMessage}</p>
                            </div>
                        )}

                        {/* Coverage Info */}
                        {coverageInfo && (
                            <div className="mt-6 space-y-4">
                                {Array.isArray(coverageInfo) ? (
                                    coverageInfo.map((info, index) => (
                                        <div key={index} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 italic">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-400 font-black uppercase">Serial:</span>
                                                    <span className="text-gray-900 font-bold">{info.serialNumber}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-400 font-black uppercase">Trạng thái:</span>
                                                    <span className={`font-black ${info.isValid ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {info.isValid ? 'Còn hạn' : 'Hết hạn'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-400 font-black uppercase">Hết hạn:</span>
                                                    <span className="text-gray-900 font-bold">{new Date(info.expirationDate).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                                {info.claimHistory && info.claimHistory.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Lịch sử bảo hành:</p>
                                                        <div className="space-y-2">
                                                            {info.claimHistory.map((claim, idx) => (
                                                                <div key={idx} className="text-[10px] flex justify-between items-center">
                                                                    <span className="text-gray-600 font-medium">{claim.issueDescription.substring(0, 30)}...</span>
                                                                    <span className={`px-2 py-0.5 rounded font-black ${claim.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
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
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 italic">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-400 font-black uppercase">Serial:</span>
                                                <span className="text-gray-900 font-bold">{coverageInfo.serialNumber}</span>
                                            </div>
                                            {coverageInfo.orderNumber && (
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-400 font-black uppercase">Hóa đơn:</span>
                                                    <span className="text-gray-900 font-bold">{coverageInfo.orderNumber}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-400 font-black uppercase">Trạng thái:</span>
                                                <span className={`font-black ${coverageInfo.isValid ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {coverageInfo.isValid ? 'Còn hạn' : 'Hết hạn'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-400 font-black uppercase">Ngày mua:</span>
                                                <span className="text-gray-900 font-bold">{new Date(coverageInfo.purchaseDate).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-400 font-black uppercase">Hết hạn:</span>
                                                <span className="text-gray-900 font-bold">{new Date(coverageInfo.expirationDate).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                            {coverageInfo.claimHistory && coverageInfo.claimHistory.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-gray-200">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Lịch sử bảo hành:</p>
                                                    <div className="space-y-2">
                                                        {coverageInfo.claimHistory.map((claim, idx) => (
                                                            <div key={idx} className="text-[10px]">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-gray-600 font-medium">{claim.issueDescription}</span>
                                                                    <span className={`px-2 py-0.5 rounded font-black ${claim.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                                                                        claim.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                                                            'bg-red-100 text-red-700'
                                                                        }`}>
                                                                        {claim.status}
                                                                    </span>
                                                                </div>
                                                                <p className="text-gray-400 font-bold">
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
                <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-gray-200/50 border border-gray-100 h-fit">
                    <h3 className="text-xl font-black text-orange-600 mb-6 uppercase italic tracking-tighter">Gửi yêu cầu bảo hành</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Số Serial (S/N)</label>
                            <input
                                value={serialNumber}
                                onChange={e => setSerialNumber(e.target.value)}
                                className="w-full px-6 py-4 rounded-xl bg-gray-50 border border-transparent focus:border-[#D70018] text-gray-900 font-bold focus:outline-none transition-all shadow-inner"
                                placeholder="Ví dụ: SN123456"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Mô tả tình trạng lỗi</label>
                            <textarea
                                value={issueDescription}
                                onChange={e => setIssueDescription(e.target.value)}
                                className="w-full px-6 py-4 rounded-xl bg-gray-50 border border-transparent focus:border-[#D70018] text-gray-900 font-bold focus:outline-none transition-all shadow-inner min-h-[140px] resize-none"
                                placeholder="Vui lòng mô tả chi tiết lỗi sản phẩm đang gặp phải..."
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Phương thức xử lý mong muốn</label>
                            <select
                                value={preferredResolution}
                                onChange={e => setPreferredResolution(e.target.value as ResolutionPreference)}
                                className="w-full px-6 py-4 rounded-xl bg-gray-50 border border-transparent focus:border-[#D70018] text-gray-900 font-bold focus:outline-none transition-all shadow-inner"
                            >
                                <option value={ResolutionPreference.Repair}>Sửa chữa</option>
                                <option value={ResolutionPreference.Replace}>Đổi mới</option>
                                <option value={ResolutionPreference.Refund}>Hoàn tiền</option>
                            </select>
                        </div>
                        {success && <p className="text-emerald-600 text-xs font-black italic uppercase">Đã gửi yêu cầu thành công!</p>}
                        {errorMessage && !success && (
                            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                <p className="text-[#D70018] font-bold text-xs tracking-tighter">{errorMessage}</p>
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={createClaim.isPending}
                            className="w-full py-4 bg-orange-600 text-white font-black rounded-xl hover:bg-orange-700 transition shadow-lg shadow-orange-600/20 uppercase tracking-widest text-[10px] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {createClaim.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
                        </button>
                    </form>
                </div>

                {/* Claims History */}
                <div className="lg:col-span-1">
                    <h3 className="text-xl font-black text-gray-900 mb-6 uppercase italic tracking-tighter">Yêu cầu của bạn</h3>
                    {isLoading ? (
                        <div className="text-center text-gray-400 font-bold py-10 italic">Đang tải dữ liệu...</div>
                    ) : claims?.length === 0 ? (
                        <div className="bg-white p-12 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest italic">
                            Chưa có yêu cầu nào.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {claims?.map(claim => (
                                <div key={claim.id} className="bg-white p-6 rounded-3xl border border-gray-100 hover:border-[#D70018]/30 transition-all shadow-lg shadow-gray-200/20 group">
                                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-50">
                                        <div>
                                            <h4 className="text-lg font-black text-gray-900 tracking-tighter">SN: {claim.serialNumber}</h4>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1 italic">Gửi ngày: {new Date(claim.filedDate).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest italic border ${claim.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            claim.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                                claim.status === 'Approved' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                    'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                            {claim.status === 'Resolved' ? 'Đã giải quyết' :
                                                claim.status === 'Rejected' ? 'Bị từ chối' :
                                                    claim.status === 'Approved' ? 'Đã chấp nhận' :
                                                        claim.status === 'Pending' ? 'Chờ xử lý' : claim.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm font-medium mb-4 italic leading-relaxed">{claim.issueDescription}</p>
                                    {claim.resolutionNotes && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-2xl text-xs text-gray-500 border border-gray-100 italic">
                                            <strong className="text-gray-900 font-black uppercase tracking-widest text-[9px] mb-1 block">Giải quyết:</strong>
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

