import { useState } from 'react';
import {
    Users2, CreditCard, Calendar, BarChart,
    UserPlus, Search, Download, CheckCircle,
    UserCheck, TrendingUp, MoreHorizontal, X, Check, Loader2
} from 'lucide-react';
import { hrApi, type Employee, type Payroll } from '../../../api/hr';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const HRPortal = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: employees = [], isLoading: empLoading } = useQuery({
        queryKey: ['hr-employees'],
        queryFn: hrApi.getEmployees,
    });

    const { data: payrolls = [], isLoading: payLoading } = useQuery({
        queryKey: ['hr-payroll'],
        queryFn: hrApi.getPayroll,
    });

    const createEmployeeMutation = useMutation({
        mutationFn: (data: any) => hrApi.createEmployee(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
            toast.success('Thêm nhân viên thành công!');
            setIsAddModalOpen(false);
        },
        onError: () => toast.error('Lỗi khi thêm nhân viên!')
    });

    const generatePayrollMutation = useMutation({
        mutationFn: ({ month, year }: { month: number, year: number }) => hrApi.generatePayroll(month, year),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-payroll'] });
            toast.success('Đã khởi tạo bảng lương tháng!');
        }
    });

    const handleAddEmployee = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            position: formData.get('position'),
            baseSalary: Number(formData.get('baseSalary')),
            hireDate: new Date().toISOString(),
            isActive: true
        };
        createEmployeeMutation.mutate(data);
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Quản trị <span className="text-[#D70018]">Nhân sự</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        Quản lý đội ngũ nhân viên và quy trình tính lương
                    </p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-[#D70018] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-[#b50014] transition-all active:scale-95 group"
                    >
                        <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
                        Thêm nhân viên
                    </button>
                </div>
            </div>

            {/* HR Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                    { label: 'Tổng nhân sự', value: employees.length, icon: <Users2 size={22} />, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Kỳ lương hiện tại', value: '12/2024', icon: <CreditCard size={22} />, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Đang làm việc', value: employees.filter(e => e.isActive).length, icon: <Calendar size={22} />, color: 'text-purple-500', bg: 'bg-purple-50' },
                    { label: 'Hiệu suất TB', value: '98%', icon: <BarChart size={22} />, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                ].map((stat, i) => (
                    <motion.div whileHover={{ y: -5 }} key={i} className="premium-card p-8 group">
                        <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">{stat.label}</p>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{stat.value}</h3>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="premium-card overflow-hidden">
                    <div className="p-8 border-b border-gray-50 bg-white/50 backdrop-blur-sm flex justify-between items-center">
                        <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Danh bạ nhân viên</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {empLoading ? (
                            <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-[#D70018]" /></div>
                        ) : employees.length === 0 ? (
                            <div className="p-20 text-center"><UserCheck className="mx-auto text-gray-100 mb-4" size={60} /><p className="text-[11px] text-gray-300 font-black uppercase italic tracking-widest">Không có dữ liệu nhân sự.</p></div>
                        ) : employees.map((emp) => (
                            <div key={emp.id} className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-all group cursor-pointer">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center font-black text-gray-400 shadow-inner group-hover:bg-[#D70018] group-hover:text-white transition-all">
                                        {emp.fullName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-800 text-sm uppercase italic tracking-tight">{emp.fullName}</h4>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 flex items-center gap-2">{emp.position} <span className="w-1 h-1 bg-gray-300 rounded-full" /> {emp.email}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-base font-black text-gray-900 tracking-tighter">₫{emp.baseSalary.toLocaleString()}</p>
                                    <p className="text-[9px] text-gray-400 uppercase tracking-widest font-black italic mt-1">{emp.isActive ? 'Đang làm việc' : 'Đã nghỉ việc'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="premium-card p-8 flex flex-col">
                    <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-6">
                        <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Bảng lương tháng 12</h3>
                        <button
                            onClick={() => generatePayrollMutation.mutate({ month: 12, year: 2024 })}
                            className="text-[10px] font-black text-[#D70018] uppercase tracking-widest hover:underline italic"
                        >
                            Chốt lương &gt;
                        </button>
                    </div>
                    <div className="space-y-4 flex-1">
                        {payLoading ? (
                            <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-gray-200" /></div>
                        ) : payrolls.length === 0 ? (
                            <div className="py-10 text-center text-[10px] font-black text-gray-200 uppercase tracking-widest">Chưa có bảng lương</div>
                        ) : payrolls.map((pay) => (
                            <div key={pay.id} className="p-5 bg-gray-50/50 hover:bg-white rounded-[20px] border border-transparent hover:border-red-100 transition-all flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${pay.isPaid ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}><CheckCircle size={18} /></div>
                                    <div>
                                        <p className="text-xs font-black text-gray-800 uppercase italic leading-none mb-1.5">{pay.employeeName || 'Thành viên'}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">₫{pay.amount.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${pay.isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {pay.isPaid ? 'Đã thanh toán' : 'Chờ trả'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Add Employee Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-8">
                            <h2 className="text-2xl font-black text-gray-900 uppercase italic mb-6 tracking-tighter">Thêm <span className="text-[#D70018]">Nhân sự mới</span></h2>
                            <form onSubmit={handleAddEmployee} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Họ và tên</label>
                                    <input name="fullName" required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vị trí</label>
                                        <input name="position" required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lương cơ bản (₫)</label>
                                        <input name="baseSalary" type="number" required defaultValue={10000000} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email liên hệ</label>
                                    <input name="email" type="email" required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold" />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 bg-gray-50 text-gray-400 font-black uppercase text-[10px] rounded-2xl">Hủy</button>
                                    <button type="submit" disabled={createEmployeeMutation.isPending} className="flex-[2] py-4 bg-[#D70018] text-white font-black uppercase text-[10px] rounded-2xl shadow-xl shadow-red-500/20">
                                        {createEmployeeMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                        Lưu nhân sự
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
