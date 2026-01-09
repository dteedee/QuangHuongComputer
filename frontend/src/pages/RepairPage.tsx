import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repairApi, type WorkOrder } from '../api/repair';

export const RepairPage = () => {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const [deviceModel, setDeviceModel] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [issueDescription, setIssueDescription] = useState('');
    const [success, setSuccess] = useState(false);

    const { data: repairs, isLoading } = useQuery<WorkOrder[]>({
        queryKey: ['repairs'],
        queryFn: repairApi.getMyWorkOrders,
        enabled: isAuthenticated
    });

    const createRepair = useMutation({
        mutationFn: (data: { deviceModel: string, serialNumber: string, description: string }) =>
            repairApi.createWorkOrder(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['repairs'] });
            setSuccess(true);
            setDeviceModel('');
            setSerialNumber('');
            setIssueDescription('');
            setTimeout(() => setSuccess(false), 3000);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createRepair.mutate({ deviceModel, serialNumber, description: issueDescription });
    };

    if (!isAuthenticated) {
        return (
            <div className="container mx-auto px-4 py-32 text-center animate-fade-in font-sans">
                <div className="bg-white p-16 max-w-2xl mx-auto rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-50">
                    <h2 className="text-3xl font-black text-gray-900 mb-4 uppercase italic tracking-tighter">Vui lòng <span className="text-[#D70018]">Đăng nhập</span></h2>
                    <p className="text-gray-500 font-medium mb-10 italic">Bạn cần đăng nhập để đặt lịch sửa chữa và theo dõi tiến độ.</p>
                    <Link to="/login" className="inline-block px-10 py-4 bg-[#D70018] text-white font-black rounded-2xl hover:bg-[#b00014] transition shadow-lg shadow-red-600/20 uppercase tracking-widest text-[10px] active:scale-95">
                        Đăng nhập ngay
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl font-sans">
            <h2 className="text-4xl font-black text-gray-900 mb-12 uppercase italic tracking-tighter">Dịch vụ <span className="text-[#D70018]">Sửa chữa</span></h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Booking Form */}
                <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-gray-200/50 border border-gray-100 h-fit">
                    <h3 className="text-xl font-black text-blue-600 mb-6 uppercase italic tracking-tighter">Đặt lịch sửa chữa</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Tên thiết bị / Model</label>
                            <input
                                value={deviceModel}
                                onChange={e => setDeviceModel(e.target.value)}
                                className="w-full px-6 py-4 rounded-xl bg-gray-50 border border-transparent focus:border-[#D70018] text-gray-900 font-bold focus:outline-none transition-all shadow-inner"
                                placeholder="Ví dụ: Dell XPS 15"
                                required
                            />
                        </div>
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
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Mô tả tình trạng</label>
                            <textarea
                                value={issueDescription}
                                onChange={e => setIssueDescription(e.target.value)}
                                className="w-full px-6 py-4 rounded-xl bg-gray-50 border border-transparent focus:border-[#D70018] text-gray-900 font-bold focus:outline-none transition-all shadow-inner min-h-[120px] resize-none"
                                placeholder="Thiết bị của bạn đang gặp vấn đề gì?"
                                required
                            />
                        </div>
                        {success && <p className="text-emerald-600 text-xs font-black italic uppercase">Đặt lịch thành công!</p>}
                        <button
                            type="submit"
                            disabled={createRepair.isPending}
                            className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 uppercase tracking-widest text-[10px] active:scale-95"
                        >
                            {createRepair.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
                        </button>
                    </form>
                </div>

                {/* Repair Status */}
                <div className="lg:col-span-2">
                    <h3 className="text-xl font-black text-gray-900 mb-6 uppercase italic tracking-tighter">Lịch sử sửa chữa</h3>
                    {isLoading ? (
                        <div className="text-center text-gray-400 font-bold py-10 italic">Đang tải dữ liệu...</div>
                    ) : repairs?.length === 0 ? (
                        <div className="bg-white p-12 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest italic">
                            Chưa có dữ liệu sửa chữa.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {repairs?.map(repair => (
                                <div key={repair.id} className="bg-white p-8 rounded-[32px] border border-gray-100 hover:border-[#D70018]/30 transition-all shadow-lg shadow-gray-200/20 group">
                                    <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-50">
                                        <div>
                                            <h4 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">{repair.deviceModel}</h4>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1 italic">S/N: {repair.serialNumber}</p>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest italic border ${repair.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            repair.status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                                                'bg-blue-50 text-blue-600 border-blue-100'
                                            }`}>
                                            {repair.status === 'Completed' ? 'Đã hoàn thành' :
                                                repair.status === 'Cancelled' ? 'Đã hủy' :
                                                    repair.status === 'Pending' ? 'Đang chờ' :
                                                        repair.status === 'InProgress' ? 'Đang xử lý' : repair.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm font-medium mb-6 italic leading-relaxed">{repair.description}</p>
                                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-black uppercase tracking-widest italic border-t border-gray-50 pt-6">
                                        <span>Ngày đặt: {new Date(repair.createdAt).toLocaleDateString('vi-VN')}</span>
                                        {repair.estimatedCost > 0 && (
                                            <span className="text-[#D70018] text-sm">Dự kiến: {repair.estimatedCost.toLocaleString('vi-VN')}₫</span>
                                        )}
                                    </div>
                                    {repair.technicalNotes && (
                                        <div className="mt-6 p-5 bg-gray-50 rounded-2xl text-xs text-gray-500 border border-gray-100 italic">
                                            <strong className="text-gray-900 font-black uppercase tracking-widest text-[9px] mb-1 block">Ghi chú kỹ thuật:</strong>
                                            {repair.technicalNotes}
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

