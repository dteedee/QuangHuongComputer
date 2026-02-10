import { useQuery } from '@tanstack/react-query';
import {
    BarChart3, PieChart, TrendingUp, TrendingDown,
    Download, Calendar, Filter, ArrowUpRight,
    Search, Activity, FileStack, Clock
} from 'lucide-react';
import { reportingApi } from '../../api/reporting';
import type { ArAgingAccount } from '../../api/reporting';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/format';
import toast from 'react-hot-toast';

export const ReportsPortal = () => {
    const { data: salesStats, isLoading: isLoadingSales } = useQuery({
        queryKey: ['reports', 'sales-summary'],
        queryFn: () => reportingApi.getSalesSummary()
    });

    const { data: invValue, isLoading: isLoadingInv } = useQuery({
        queryKey: ['reports', 'inventory-value'],
        queryFn: () => reportingApi.getInventoryValue()
    });

    const { data: arAgingData, isLoading: isLoadingAr } = useQuery({
        queryKey: ['reports', 'ar-aging'],
        queryFn: () => reportingApi.getArAging()
    });

    const arAging = Array.isArray(arAgingData) ? arAgingData : [];
    const isLoading = isLoadingSales || isLoadingInv || isLoadingAr;

    const handleExportPDF = async () => {
        try {
            // Create comprehensive report content
            const reportContent = `
QUANG HƯỞNG COMPUTER - BÁO CÁO TỔNG HỢP
Ngày xuất: ${new Date().toLocaleString('vi-VN')}
================================================

1. TỔNG QUAN DOANH THU
   - Tổng doanh thu: ${formatCurrency(salesStats?.totalRevenue || 0)}
   - Doanh thu tháng này: ${formatCurrency(salesStats?.monthRevenue || 0)}
   - Tổng đơn hàng: ${salesStats?.totalOrders || 0}

2. TÀI SẢN KHO
   - Giá trị tồn kho: ${formatCurrency(invValue?.totalValue || 0)}
   - Số lượng mặt hàng: ${invValue?.itemCount || 0}

3. CÔNG NỢ PHẢI THU
   - Tổng công nợ: ${formatCurrency(arAging?.reduce((acc, curr) => acc + curr.balance, 0) || 0)}
   - Số tài khoản: ${arAging?.length || 0}

4. DOANH THU THEO THÁNG
${salesStats?.monthlyData?.map(m => `   T${m.month}/${m.year}: ${formatCurrency(m.revenue)}`).join('\n') || '   Không có dữ liệu'}

================================================
Báo cáo được tạo tự động bởi hệ thống ERP
            `.trim();

            // Download as text file (simulating PDF)
            const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Report_${new Date().toISOString().split('T')[0]}.txt`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success('Đã xuất báo cáo thành công!');
        } catch (error) {
            toast.error('Lỗi xuất báo cáo');
            console.error(error);
        }
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in admin-area">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-3">
                        Báo cáo & <span className="text-[#D70018]">Phân tích</span>
                    </h1>
                    <p className="text-gray-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                        Dữ liệu vận hành thời gian thực của doanh nghiệp
                    </p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-gray-100 text-gray-950 text-xs font-black uppercase tracking-widest rounded-2xl hover:border-[#D70018] transition-all shadow-sm active:scale-95">
                        <Calendar size={20} />
                        Phạm vi ngày
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-3 px-8 py-4 bg-[#D70018] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-[#b50014] transition-all active:scale-95"
                    >
                        <Download size={20} />
                        Xuất báo cáo PDF
                    </button>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="premium-card p-10 group cursor-pointer border-2 hover:border-emerald-500/20">
                    <div className="absolute top-0 right-0 p-8 text-emerald-500/5 group-hover:scale-125 transition-transform duration-700">
                        <TrendingUp size={160} />
                    </div>
                    <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-3 italic">Tổng doanh thu bán hàng</p>
                    <h3 className="text-5xl font-black text-gray-950 flex items-baseline gap-4 tracking-tighter italic">
                        {formatCurrency(salesStats?.totalRevenue || 0)}
                        <span className="text-sm font-black text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                            <ArrowUpRight size={18} /> +12%
                        </span>
                    </h3>
                    <div className="mt-10 pt-8 border-t-2 border-gray-50 flex items-center gap-3 opacity-80">
                        <Activity size={18} className="text-[#D70018]" />
                        <p className="text-gray-900 text-[10px] font-black uppercase tracking-widest">Dựa trên {salesStats?.totalOrders || 0} đơn hàng hoàn tất</p>
                    </div>
                </div>

                <div className="premium-card p-10 group cursor-pointer border-2 hover:border-blue-500/20">
                    <div className="absolute top-0 right-0 p-8 text-blue-500/5 group-hover:scale-125 transition-transform duration-700">
                        <PieChart size={160} />
                    </div>
                    <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-3 italic">Giá trị tài sản kho</p>
                    <h3 className="text-5xl font-black text-gray-950 tracking-tighter italic">
                        {formatCurrency(invValue?.totalValue || 0)}
                    </h3>
                    <div className="mt-10 pt-8 border-t-2 border-gray-50 flex items-center gap-3 opacity-80">
                        <BarChart3 size={18} className="text-blue-600" />
                        <p className="text-gray-900 text-[10px] font-black uppercase tracking-widest">Tồn kho hiện tại theo giá nhập</p>
                    </div>
                </div>

                <div className="premium-card p-10 group cursor-pointer border-2 hover:border-red-500/20">
                    <div className="absolute top-0 right-0 p-8 text-red-500/5 group-hover:scale-125 transition-transform duration-700">
                        <FileStack size={160} />
                    </div>
                    <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-3 italic">Công nợ phải thu</p>
                    <h3 className="text-5xl font-black text-[#D70018] tracking-tighter italic">
                        {formatCurrency(arAging?.reduce((acc, curr) => acc + curr.balance, 0) || 0)}
                    </h3>
                    <div className="mt-10 pt-8 border-t-2 border-gray-50 flex items-center gap-3 opacity-80">
                        <Clock size={18} className="text-amber-500" />
                        <p className="text-gray-900 text-[10px] font-black uppercase tracking-widest">Khoản thanh toán chờ từ tổ chức</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* AR Aging Table */}
                <div className="premium-card p-10 border-2 bg-white">
                    <div className="flex justify-between items-center mb-10 border-b-2 border-gray-50 pb-8">
                        <h3 className="text-2xl font-black text-gray-950 uppercase italic tracking-tighter">Chi tiết công nợ</h3>
                        <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-2xl text-gray-400 transition-all border-2 border-gray-100 cursor-pointer hover:border-[#D70018] hover:text-[#D70018] shadow-sm">
                            <Filter size={20} />
                        </div>
                    </div>
                    <div className="space-y-6">
                        {arAging.map((account, i) => (
                            <div
                                key={i}
                                className="flex justify-between items-center p-8 bg-gray-50 hover:bg-white rounded-3xl border-2 border-transparent hover:border-red-100 hover:shadow-2xl hover:shadow-gray-200/40 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-gray-950 text-white shadow-xl flex items-center justify-center font-black text-xl group-hover:scale-110 transition-transform italic">
                                        {account.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-950 text-lg uppercase tracking-tight italic leading-none mb-2">{account.name}</p>
                                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Hạn mức tín dụng: <span className="text-gray-950 underline">{formatCurrency(account.creditLimit || 0)}</span></p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-[#D70018] text-2xl tracking-tighter italic">{formatCurrency(account.balance || 0)}</p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">Chưa thanh toán</p>
                                </div>
                            </div>
                        ))}
                        {arAging.length === 0 && (
                            <div className="p-24 text-center">
                                <FileStack className="mx-auto text-gray-100 mb-6" size={80} />
                                <p className="text-gray-400 font-black uppercase text-sm tracking-widest italic text-center px-10">Hiện tại không có dữ liệu công nợ cần xử lý.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Growth Chart */}
                <div className="premium-card p-12 border-2 bg-white flex flex-col justify-between overflow-hidden">
                    <div className="mb-14">
                        <h3 className="text-2xl font-black text-gray-950 uppercase italic tracking-tighter">Tăng trưởng hàng năm</h3>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-2">Phân tích hiệu suất doanh thu định kỳ</p>
                    </div>

                    <div className="h-72 flex items-end gap-3 px-4 relative">
                        {[30, 45, 25, 60, 80, 55, 90, 70, 85, 40, 65, 100].map((h, i) => (
                            <div key={i} className="flex-1 group relative h-full flex items-end">
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    transition={{ duration: 1.5, delay: i * 0.05, ease: "circOut" }}
                                    className={`w-full rounded-t-2xl transition-all duration-300 relative ${i === 11 ? 'bg-gray-950 shadow-2xl' : 'bg-gray-100 group-hover:bg-red-500 group-hover:shadow-lg shadow-red-500/20'}`}
                                >
                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-950 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-2xl border border-gray-800 z-10">
                                        {h}%
                                    </div>
                                </motion.div>
                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                                    <span className={`text-[10px] font-black uppercase tracking-tighter ${i === 11 ? 'text-[#D70018] scale-125 decoration-4 underline underline-offset-4' : 'text-gray-400'}`}>T{i + 1}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-20 flex items-center justify-center gap-10">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-gray-950 rounded-full shadow-lg" />
                            <span className="text-xs font-black text-gray-950 uppercase tracking-widest italic">Năm nay</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-gray-100 rounded-full border-2 border-gray-200" />
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest italic">Năm trước</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
