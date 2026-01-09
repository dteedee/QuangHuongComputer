
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warrantyApi, type WarrantyClaim, type WarrantyCoverage } from '../api/warranty';

export const WarrantyPage = () => {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const [serialNumber, setSerialNumber] = useState('');
    const [issueDescription, setIssueDescription] = useState('');
    const [success, setSuccess] = useState(false);
    const [lookupSerial, setLookupSerial] = useState('');
    const [coverageInfo, setCoverageInfo] = useState<WarrantyCoverage | null>(null);

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
            setSerialNumber('');
            setIssueDescription('');
            setTimeout(() => setSuccess(false), 3000);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createClaim.mutate({ serialNumber, issueDescription });
    };

    const handleLookup = async () => {
        if (!lookupSerial) return;
        try {
            const data = await warrantyApi.lookupCoverage(lookupSerial);
            setCoverageInfo(data);
        } catch (error) {
            setCoverageInfo({ serialNumber: lookupSerial, productId: '', status: 'Lỗi', expirationDate: '', isValid: false, error: 'Không tìm thấy số Serial' });
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
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Số Serial (S/N)</label>
                            <input
                                value={lookupSerial}
                                onChange={e => setLookupSerial(e.target.value)}
                                className="w-full px-6 py-4 rounded-xl bg-gray-50 border border-transparent focus:border-[#D70018] text-gray-900 font-bold focus:outline-none transition-all shadow-inner"
                                placeholder="Ví dụ: SN123456"
                            />
                        </div>
                        <button
                            onClick={handleLookup}
                            className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 uppercase tracking-widest text-[10px] active:scale-95"
                        >
                            Kiểm tra trạng thái
                        </button>
                        {coverageInfo && (
                            <div className="mt-6 p-5 bg-gray-50 rounded-2xl border border-gray-100 italic">
                                {coverageInfo.error ? (
                                    <p className="text-[#D70018] font-bold text-sm tracking-tighter">{coverageInfo.error}</p>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-400 font-black uppercase">Serial:</span>
                                            <span className="text-gray-900 font-bold">{coverageInfo.serialNumber}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-400 font-black uppercase">Trạng thái:</span>
                                            <span className="text-emerald-600 font-black">{coverageInfo.status}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-400 font-black uppercase">Hết hạn:</span>
                                            <span className="text-gray-900 font-bold">{new Date(coverageInfo.expirationDate).toLocaleDateString('vi-VN')}</span>
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
                        {success && <p className="text-emerald-600 text-xs font-black italic uppercase">Đã gửi yêu cầu thành công!</p>}
                        <button
                            type="submit"
                            disabled={createClaim.isPending}
                            className="w-full py-4 bg-orange-600 text-white font-black rounded-xl hover:bg-orange-700 transition shadow-lg shadow-orange-600/20 uppercase tracking-widest text-[10px] active:scale-95"
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

