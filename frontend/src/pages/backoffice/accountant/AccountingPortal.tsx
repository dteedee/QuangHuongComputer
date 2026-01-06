import { useState } from 'react';
import {
    Receipt, Landmark, Landmark as Bank,
    FileText, ArrowUpRight, ArrowDownRight, Search, Filter,
    CheckCircle2, AlertCircle, TrendingUp, X, Check, Loader2
} from 'lucide-react';
import { accountingApi, OrganizationAccount } from '../../../api/accounting';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const AccountingPortal = () => {
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: accounts = [], isLoading } = useQuery({
        queryKey: ['accounting-accounts'],
        queryFn: accountingApi.getAccounts,
    });

    const { data: stats } = useQuery({
        queryKey: ['accounting-stats'],
        queryFn: accountingApi.getStats,
    });

    const createAccountMutation = useMutation({
        mutationFn: (data: any) => accountingApi.createAccount(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounting-accounts'] });
            toast.success('Tạo tài khoản tổ chức thành công!');
            setIsAccountModalOpen(false);
        }
    });

    const handleCreateAccount = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            organizationName: formData.get('name'),
            contactEmail: formData.get('email'),
            creditLimit: Number(formData.get('creditLimit'))
        };
        createAccountMutation.mutate(data);
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Quản lý <span className="text-[#D70018]">Kế toán</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        Vận hành tài chính, quản lý hóa đơn và công nợ tổ chức
                    </p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsAccountModalOpen(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-[#D70018] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-black transition-all active:scale-95 group"
                    >
                        <Landmark size={18} />
                        Thêm đối tác mới
                    </button>
                </div>
            </div>

            {/* Account Balances */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <motion.div whileHover={{ y: -5 }} className="premium-card p-10 group bg-gray-900 border-none shadow-2xl">
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3 italic">Tổng nợ phải thu (AR)</p>
                    <h3 className="text-4xl font-black text-white flex items-baseline gap-3 tracking-tighter">
                        ₫{stats?.totalReceivables?.toLocaleString() || '0'}
                        <ArrowDownRight className="text-rose-500" size={24} />
                    </h3>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="premium-card p-10 group border-none shadow-xl shadow-gray-200/50">
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3 italic">Hóa đơn trong tháng</p>
                    <h3 className="text-4xl font-black text-gray-900 flex items-baseline gap-3 tracking-tighter">
                        {stats?.totalInvoices || '0'}
                        <FileText className="text-blue-500" size={24} />
                    </h3>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="premium-card p-10 group bg-emerald-50 border-none shadow-xl shadow-emerald-700/5">
                    <p className="text-emerald-600/60 text-[10px] font-black uppercase tracking-widest mb-3 italic">Doanh thu hôm nay</p>
                    <h3 className="text-4xl font-black text-emerald-700 tracking-tighter">
                        ₫{stats?.dailyRevenue?.toLocaleString() || '0'}
                    </h3>
                </motion.div>
            </div>

            {/* Corporate Accounts Table */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="premium-card overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                    <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Tài khoản Tổ chức & Doanh nghiệp</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/80 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Đối tác</th>
                                <th className="px-8 py-5 text-right">Tín dụng</th>
                                <th className="px-8 py-5 text-right">Số dư nợ</th>
                                <th className="px-8 py-5 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan={4} className="px-8 py-20 text-center"><Loader2 className="mx-auto animate-spin text-[#D70018]" /></td></tr>
                            ) : accounts.length === 0 ? (
                                <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-300 font-black uppercase text-[10px]">Không có dữ liệu</td></tr>
                            ) : accounts.map((account: OrganizationAccount) => (
                                <tr key={account.id} className="hover:bg-gray-50/50 transition-all group cursor-pointer">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-blue-500">
                                                <Landmark size={20} />
                                            </div>
                                            <div>
                                                <span className="font-black text-gray-800 text-sm uppercase italic tracking-tight">{account.organizationName}</span>
                                                <p className="text-[10px] text-gray-400 font-bold lowercase">{account.contactEmail}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right font-black text-gray-400 tracking-tighter">₫{account.creditLimit.toLocaleString()}</td>
                                    <td className="px-8 py-6 text-right font-black text-rose-600 text-base tracking-tighter">₫{account.balance.toLocaleString()}</td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-[#D70018] shadow-sm"><FileText size={18} /></button>
                                            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-emerald-600 shadow-sm"><Receipt size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Create Account Modal */}
            <AnimatePresence>
                {isAccountModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAccountModalOpen(false)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-8">
                            <h2 className="text-2xl font-black text-gray-900 uppercase italic mb-6 tracking-tighter">Thêm <span className="text-[#D70018]">Đối tác Công nợ</span></h2>
                            <form onSubmit={handleCreateAccount} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tên tổ chức</label>
                                    <input name="name" required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email liên hệ</label>
                                    <input name="email" type="email" required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hạn mức tín dụng (₫)</label>
                                    <input name="creditLimit" type="number" required defaultValue={100000000} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold" />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setIsAccountModalOpen(false)} className="flex-1 py-4 bg-gray-50 text-gray-400 font-black uppercase text-[10px] rounded-2xl">Hủy</button>
                                    <button type="submit" disabled={createAccountMutation.isPending} className="flex-[2] py-4 bg-[#D70018] text-white font-black uppercase text-[10px] rounded-2xl shadow-xl shadow-red-500/20">
                                        {createAccountMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                        Lưu đối tác
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
