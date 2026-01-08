import { useState, useEffect } from 'react';
import { DollarSign, FileText, TrendingUp, Clock, Download, Eye, Calendar, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import client from '../../../api/client';

interface Invoice {
    id: string;
    invoiceNumber: string;
    type: number;
    status: number;
    customerId?: string;
    supplierId?: string;
    issueDate: string;
    dueDate: string;
    subTotal: number;
    vatAmount: number;
    totalAmount: number;
    paidAmount: number;
}

interface AccountingStats {
    totalReceivables: number;
    revenueToday: number;
    totalInvoices: number;
    activeAccounts: number;
}

export const AccountingPortal = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [stats, setStats] = useState<AccountingStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [invoicesRes, statsRes] = await Promise.all([
                client.get('/accounting/invoices?page=1&pageSize=20'),
                client.get('/accounting/stats')
            ]);
            setInvoices(invoicesRes.data.invoices || []);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to fetch accounting data', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: number) => {
        switch (status) {
            case 0: return <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-black uppercase">Draft</span>;
            case 1: return <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase">Issued</span>;
            case 2: return <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-black uppercase">Partial</span>;
            case 3: return <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-black uppercase">Paid</span>;
            case 4: return <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-black uppercase">Overdue</span>;
            case 5: return <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-xs font-black uppercase">Cancelled</span>;
            default: return null;
        }
    };

    const viewInvoiceHTML = (invoiceId: string) => {
        window.open(`${client.defaults.baseURL}/accounting/invoices/${invoiceId}/html`, '_blank');
    };

    return (
        <div className="space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Kế toán & <span className="text-[#D70018]">Tài chính</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                        Quản lý hóa đơn, công nợ và báo cáo tài chính
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-50 text-[#D70018] rounded-2xl">
                            <DollarSign size={24} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Công nợ</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
                        ${(stats?.totalReceivables || 0).toLocaleString()}
                    </h3>
                    <p className="text-xs text-gray-400 font-bold mt-2">Phải thu khách hàng</p>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                            <TrendingUp size={24} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Doanh thu</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
                        ${(stats?.revenueToday || 0).toLocaleString()}
                    </h3>
                    <p className="text-xs text-gray-400 font-bold mt-2">Hôm nay</p>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <FileText size={24} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Hóa đơn</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{stats?.totalInvoices || 0}</h3>
                    <p className="text-xs text-gray-400 font-bold mt-2">Tổng số hóa đơn</p>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                            <Clock size={24} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Tài khoản</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{stats?.activeAccounts || 0}</h3>
                    <p className="text-xs text-gray-400 font-bold mt-2">Đang hoạt động</p>
                </motion.div>
            </div>

            {/* Invoices Table */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="premium-card overflow-hidden"
            >
                <div className="p-8 border-b border-gray-50 bg-white/50 backdrop-blur-sm flex justify-between items-center">
                    <h3 className="text-xl font-black text-gray-900 uppercase italic">Danh sách hóa đơn</h3>
                    <div className="flex gap-3">
                        <button className="px-4 py-2 bg-gray-50 text-gray-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all">
                            <Filter size={14} className="inline mr-2" />
                            Lọc
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Số hóa đơn</th>
                                <th className="px-8 py-5">Ngày phát hành</th>
                                <th className="px-8 py-5">Hạn thanh toán</th>
                                <th className="px-8 py-5">Tổng tiền</th>
                                <th className="px-8 py-5">Đã thanh toán</th>
                                <th className="px-8 py-5">Trạng thái</th>
                                <th className="px-8 py-5 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-20 text-center text-gray-300">
                                        Đang tải...
                                    </td>
                                </tr>
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-20 text-center">
                                        <FileText className="mx-auto text-gray-100 mb-4" size={60} />
                                        <p className="text-[11px] text-gray-300 font-black uppercase italic tracking-widest">
                                            Chưa có hóa đơn nào.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <span className="font-black text-[#D70018] font-mono">
                                                {invoice.invoiceNumber}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-gray-600 text-xs font-bold">
                                                <Calendar size={14} />
                                                {new Date(invoice.issueDate).toLocaleDateString('vi-VN')}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-xs text-gray-600 font-bold">
                                                {new Date(invoice.dueDate).toLocaleDateString('vi-VN')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-black text-gray-900 text-base">
                                                ${invoice.totalAmount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-xs text-gray-600 font-bold">
                                                ${invoice.paidAmount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">{getStatusBadge(invoice.status)}</td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => viewInvoiceHTML(invoice.id)}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-300 hover:text-[#D70018] hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};
