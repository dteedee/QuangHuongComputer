import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Users2, CreditCard, Calendar, BarChart,
    UserPlus, CheckCircle,
    UserCheck, Loader2, X, Check, Briefcase,
    ClipboardCheck, MessageSquare, UserCog
} from 'lucide-react';
import { hrApi, type Employee, type Payroll } from '../../../api/hr';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../../utils/format';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { z } from 'zod';
import { validationMessages as msg } from '../../../lib/validation/messages';

export const HRPortal = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const queryClient = useQueryClient();

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const { data: employeesResponse, isLoading: empLoading } = useQuery({
        queryKey: ['hr-employees'],
        queryFn: () => hrApi.getEmployees(),
    });

    const employees = employeesResponse?.items || [];

    const { data: payrolls = [], isLoading: payLoading } = useQuery<Payroll[]>({
        queryKey: ['hr-payroll', currentMonth, currentYear],
        queryFn: () => hrApi.getPayrolls(currentMonth, currentYear),
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
        const fullName = formData.get('fullName') as string;
        const email = formData.get('email') as string;
        const position = formData.get('position') as string;
        const baseSalary = Number(formData.get('baseSalary'));

        const schema = z.object({
            fullName: z.string().min(1, msg.requireInput('Họ và tên')),
            email: z.string().min(1, msg.requireInput('Email')).email(msg.email),
            position: z.string().min(1, msg.requireInput('Vị trí')),
            baseSalary: z.number().min(0, 'Lương không được âm')
        });

        const result = schema.safeParse({ fullName, email, position, baseSalary });

        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach(issue => {
                const path = issue.path[0]?.toString();
                if (path) fieldErrors[path] = issue.message;
            });
            setErrors(fieldErrors);
            return;
        }

        setErrors({});
        createEmployeeMutation.mutate({
            fullName,
            email,
            position,
            baseSalary,
            department: 'IT',
            hireDate: new Date().toISOString(),
            status: 'Active' as const,
        });
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 leading-none mb-2">
                        Quản trị <span className="text-accent">Nhân sự</span>
                    </h1>
                    <p className="text-gray-500 font-medium text-xs flex items-center gap-2">
                        Quản lý đội ngũ nhân viên và quy trình tính lương
                    </p>
                </div>
                <div className="flex gap-4">
                    <Link
                        to="/backoffice/hr/recruitment"
                        className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-sm shadow-gray-200 hover:bg-gray-800 transition-all active:scale-95 group"
                    >
                        <Briefcase size={18} className="group-hover:scale-110 transition-transform" />
                        Quản lý tuyển dụng
                    </Link>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-accent text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-500/15 hover:bg-accent-hover transition-all active:scale-95 group"
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
                    { label: 'Kỳ lương hiện tại', value: `${currentMonth}/${currentYear}`, icon: <CreditCard size={22} />, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Đang làm việc', value: employees.filter(e => e.status === 'Active').length, icon: <Calendar size={22} />, color: 'text-purple-500', bg: 'bg-purple-50' },
                    { label: 'Hiệu suất TB', value: '98%', icon: <BarChart size={22} />, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                ].map((stat, i) => (
                    <motion.div whileHover={{ y: -5 }} key={i} className="premium-card p-8 group">
                        <div className={`p-4 ${stat.bg} ${stat.color} rounded-xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                        <p className="text-gray-400 text-xs text-slate-500 mb-1">{stat.label}</p>
                        <h3 className="text-xl font-semibold text-slate-900">{stat.value}</h3>
                    </motion.div>
                ))}
            </div>

            {/* Quick Nav Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Chấm Công', desc: 'Check-in / check-out', to: '/backoffice/hr/attendance', icon: <Calendar size={24} />, color: 'text-green-600 bg-green-50' },
                    { label: 'Duyệt Phép', desc: 'Quản lý nghỉ phép', to: '/backoffice/hr/approvals', icon: <ClipboardCheck size={24} />, color: 'text-orange-600 bg-orange-50' },
                    { label: 'Tự Phục Vụ', desc: 'Hồ sơ & phiếu lương', to: '/backoffice/hr/self-service', icon: <UserCog size={24} />, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Chat Nội Bộ', desc: 'Nhắn tin nội bộ', to: '/backoffice/hr/chat', icon: <MessageSquare size={24} />, color: 'text-purple-600 bg-purple-50' },
                ].map(card => (
                    <Link
                        key={card.to}
                        to={card.to}
                        className="premium-card p-6 flex flex-col gap-3 hover:shadow-lg transition-all active:scale-95 group"
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color} group-hover:scale-110 transition-transform`}>
                            {card.icon}
                        </div>
                        <div>
                            <p className="font-semibold text-sm  tracking-tight text-gray-900">{card.label}</p>
                            <p className="text-xs text-gray-400 font-bold uppercase mt-0.5">{card.desc}</p>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="premium-card overflow-hidden">
                    <div className="p-8 border-b border-gray-50 bg-white/50 backdrop-blur-sm flex justify-between items-center">
                        <h3 className="text-xl font-semibold text-gray-900  tracking-tighter">Danh bạ nhân viên</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {empLoading ? (
                            <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-accent" /></div>
                        ) : employees.length === 0 ? (
                            <div className="p-20 text-center"><UserCheck className="mx-auto text-gray-100 mb-4" size={60} /><p className="text-xs text-gray-300 font-semibold">Không có dữ liệu nhân sự.</p></div>
                        ) : employees.map((emp) => (
                            <div key={emp.id} className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-all group cursor-pointer">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center font-semibold text-gray-400 shadow-inner group-hover:bg-accent group-hover:text-white transition-all">
                                        {emp.fullName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800 text-sm  tracking-tight">{emp.fullName}</h4>
                                        <p className="text-xs font-bold text-gray-400 uppercase mt-1 flex items-center gap-2">{emp.position} <span className="w-1 h-1 bg-gray-300 rounded-full" /> {emp.email}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-base font-semibold text-gray-900 tracking-tighter">{formatCurrency(emp.baseSalary)}</p>
                                    <p className="text-[9px] text-gray-400 uppercase font-semibold italic mt-1">{emp.status === 'Active' ? 'Đang làm việc' : 'Nghỉ việc/Vắng mặt'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="premium-card p-8 flex flex-col">
                    <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-6">
                        <h3 className="text-xl font-semibold text-gray-900  tracking-tighter">Bảng lương tháng {currentMonth}</h3>
                        <button
                            onClick={() => generatePayrollMutation.mutate({ month: currentMonth, year: currentYear })}
                            className="text-xs font-semibold text-accent uppercase hover:underline"
                        >
                            Chốt lương &gt;
                        </button>
                    </div>
                    <div className="space-y-4 flex-1">
                        {payLoading ? (
                            <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-gray-200" /></div>
                        ) : payrolls.length === 0 ? (
                            <div className="py-10 text-center text-xs font-semibold text-gray-200 uppercase">Chưa có bảng lương</div>
                        ) : payrolls.map((pay) => (
                            <div key={pay.id} className="p-5 bg-gray-50/50 hover:bg-white rounded-[20px] border border-transparent hover:border-red-100 transition-all flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${pay.status === 'Paid' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}><CheckCircle size={18} /></div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-800  leading-none mb-1.5">{pay.employeeName || 'Thành viên'}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">{formatCurrency(pay.netPay)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-[9px] font-semibold px-2 py-1 rounded-lg ${pay.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {pay.status === 'Paid' ? 'Đã thanh toán' : pay.status === 'Processed' ? 'Đã xử lý' : 'Chờ xử lý'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Add Employee Modal */}
            {/* Add Employee Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Thêm Nhân sự mới"
                description="Nhập thông tin chi tiết để thêm nhân sự vào hệ thống"
            >
                <form onSubmit={handleAddEmployee} className="space-y-6">
                    <Input 
                        label="Họ và tên" 
                        name="fullName" 
                        error={errors.fullName}
                        placeholder="Nhập họ và tên nhân viên" 
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Vị trí" 
                            name="position" 
                            error={errors.position}
                            placeholder="VD: Kỹ thuật viên" 
                        />
                        <Input 
                            label="Lương cơ bản" 
                            name="baseSalary" 
                            type="number" 
                            error={errors.baseSalary}
                            defaultValue={10000000} 
                        />
                    </div>
                    <Input 
                        label="Email liên hệ" 
                        name="email" 
                        type="email" 
                        error={errors.email}
                        placeholder="email@example.com" 
                    />
                    <div className="flex gap-4 pt-4">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsAddModalOpen(false)} 
                            className="flex-1 uppercase text-xs"
                        >
                            Hủy
                        </Button>
                        <Button 
                            type="submit" 
                            loading={createEmployeeMutation.isPending} 
                            icon={Check} 
                            className="flex-[2] uppercase text-xs"
                        >
                            Lưu nhân sự
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
