import { useState, useEffect } from 'react';
import {
    BarChart3, PieChart, TrendingUp, TrendingDown,
    Download, Calendar, Filter, ArrowUpRight,
    Search, Activity, FileStack, Clock
} from 'lucide-react';
import client from '../../api/client';
import { motion } from 'framer-motion';

export const ReportsPortal = () => {
    const [salesStats, setSalesStats] = useState<any>(null);
    const [invValue, setInvValue] = useState<any>(null);
    const [arAging, setArAging] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            setIsLoading(true);
            try {
                const [salesRes, invRes, arRes] = await Promise.all([
                    client.get('/reports/sales-summary'),
                    client.get('/reports/inventory-value'),
                    client.get('/reports/ar-aging')
                ]);
                setSalesStats(salesRes.data);
                setInvValue(invRes.data);
                setArAging(arRes.data);
            } catch (error) {
                console.error('Failed to fetch reporting data', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReports();
    }, []);

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Báo cáo & <span className="text-[#D70018]">Phân tích</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        Dữ liệu vận hành thời gian thực của doanh nghiệp
                    </p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-3 px-6 py-3.5 bg-white border border-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:shadow-md transition-all active:scale-95">
                        <Calendar size={18} />
                        Phạm vi ngày
                    </button>
                    <button className="flex items-center gap-3 px-6 py-3.5 bg-[#D70018] text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-[#b50014] transition-all active:scale-95">
                        <Download size={18} />
                        Xuất báo cáo PDF
                    </button>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="premium-card p-10 group cursor-pointer"
                >
                    <div className="absolute top-0 right-0 p-8 text-emerald-500/5 group-hover:scale-125 transition-transform duration-700">
                        <TrendingUp size={120} />
                    </div>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 italic">Tổng doanh thu bán hàng</p>
                    <h3 className="text-4xl font-black text-gray-900 flex items-baseline gap-3 tracking-tighter">
                        {salesStats?.totalRevenue?.toLocaleString() || '0'}₫
                        <span className="text-xs font-black text-emerald-500 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                            <ArrowUpRight size={14} /> 12%
                        </span>
                    </h3>
                    <div className="mt-8 pt-6 border-t border-gray-50 flex items-center gap-2">
                        <Activity size={14} className="text-[#D70018]" />
                        <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">Dựa trên {salesStats?.totalOrders || 0} đơn hàng hoàn tất</p>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="premium-card p-10 group cursor-pointer"
                >
                    <div className="absolute top-0 right-0 p-8 text-blue-500/5 group-hover:scale-125 transition-transform duration-700">
                        <PieChart size={120} />
                    </div>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 italic">Giá trị tài sản kho</p>
                    <h3 className="text-4xl font-black text-gray-900 tracking-tighter">
                        {invValue?.totalValue?.toLocaleString() || '0'}₫
                    </h3>
                    <div className="mt-8 pt-6 border-t border-gray-50 flex items-center gap-2">
                        <BarChart3 size={14} className="text-blue-500" />
                        <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">Tồn kho hiện tại theo giá nhập</p>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="premium-card p-10 group cursor-pointer"
                >
                    <div className="absolute top-0 right-0 p-8 text-red-500/5 group-hover:scale-125 transition-transform duration-700">
                        <FileStack size={120} />
                    </div>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 italic">Công nợ phải thu</p>
                    <h3 className="text-4xl font-black text-[#D70018] tracking-tighter">
                        {arAging?.reduce((acc, curr) => acc + curr.balance, 0)?.toLocaleString() || '0'}₫
                    </h3>
                    <div className="mt-8 pt-6 border-t border-gray-50 flex items-center gap-2">
                        <Clock size={14} className="text-amber-500" />
                        <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">Khoản thanh toán chờ từ tổ chức</p>
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* AR Aging Table */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="premium-card p-8"
                >
                    <div className="flex justify-between items-center mb-10 border-b border-gray-50 pb-6">
                        <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Chi tiết công nợ</h3>
                        <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl text-gray-400 transition-colors border border-gray-100 cursor-pointer hover:text-[#D70018]">
                            <Filter size={18} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        {arAging.map((account, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ x: 10 }}
                                className="flex justify-between items-center p-6 bg-gray-50 hover:bg-white rounded-2xl border border-transparent hover:border-red-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white shadow-inner flex items-center justify-center font-black text-gray-300 group-hover:text-[#D70018]">
                                        {account.organizationName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-800 text-sm uppercase tracking-tight italic leading-none">{account.organizationName}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">Hạn mức: {account.creditLimit?.toLocaleString()}₫</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-[#D70018] text-lg tracking-tighter">{account.balance?.toLocaleString()}₫</p>
                                    <p className="text-[9px] text-gray-400 uppercase tracking-widest font-black">Số dư chưa thanh toán</p>
                                </div>
                            </motion.div>
                        ))}
                        {arAging.length === 0 && (
                            <div className="p-20 text-center text-gray-300 italic text-[11px] font-black uppercase tracking-widest bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                                Không có dữ liệu công nợ.
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Growth Chart */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="premium-card p-10 flex flex-col justify-between"
                >
                    <div className="mb-10">
                        <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Tăng trưởng hàng năm</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">So sánh doanh thu với năm trước</p>
                    </div>

                    <div className="h-60 flex items-end gap-3 px-4">
                        {[30, 45, 25, 60, 80, 55, 90, 70, 85, 40, 65, 100].map((h, i) => (
                            <div key={i} className="flex-1 group relative">
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    transition={{ duration: 1.5, delay: i * 0.05, ease: "circOut" }}
                                    className={`w-full rounded-t-xl transition-all duration-300 relative ${i === 11 ? 'bg-[#D70018]' : 'bg-gray-100 group-hover:bg-red-100'}`}
                                >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl">
                                        {h}%
                                    </div>
                                </motion.div>
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                                    <span className={`text-[9px] font-black uppercase ${i === 11 ? 'text-[#D70018]' : 'text-gray-300'}`}>T{i + 1}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-20 flex items-center justify-center gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-[#D70018] rounded-full" />
                            <span className="text-[10px] font-black text-gray-500 uppercase">Năm nay</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-gray-100 rounded-full" />
                            <span className="text-[10px] font-black text-gray-500 uppercase">Năm trước</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
