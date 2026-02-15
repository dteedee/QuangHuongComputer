import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Wallet, Clock, CheckCircle, CreditCard, Plus, X, Filter } from 'lucide-react';
import { expenseApi, type Expense, type ExpenseCategory, type ExpenseStatus, type CreateExpenseRequest } from '../../../api/accounting';
import { DataTable, type Column } from '../../../components/crud/DataTable';
import { formatCurrency } from '../../../utils/format';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

const expenseSchema = z.object({
    categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
    description: z.string().min(3, 'Mô tả phải có ít nhất 3 ký tự'),
    amount: z.number().positive('Số tiền phải lớn hơn 0'),
    vatRate: z.number().min(0).max(100),
    currency: z.string().default('VND'),
    expenseDate: z.string(),
    supplierId: z.string().optional(),
    employeeId: z.string().optional(),
    notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface CreateExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: ExpenseCategory[];
    onSubmit: (data: CreateExpenseRequest) => Promise<void>;
    isSubmitting: boolean;
}

function CreateExpenseModal({ isOpen, onClose, categories, onSubmit, isSubmitting }: CreateExpenseModalProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
    } = useForm<ExpenseFormData>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            categoryId: '',
            description: '',
            amount: 0,
            vatRate: 10,
            currency: 'VND',
            expenseDate: new Date().toISOString().split('T')[0],
            notes: '',
        },
    });

    const amount = watch('amount');
    const vatRate = watch('vatRate');
    const vatAmount = amount * vatRate / 100;
    const totalAmount = amount + vatAmount;

    const handleFormSubmit = async (data: ExpenseFormData) => {
        await onSubmit({
            ...data,
            supplierId: data.supplierId || undefined,
            employeeId: data.employeeId || undefined,
        });
        reset();
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-950/50 backdrop-blur-sm" onClick={handleClose}></div>

                <div className="inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full border border-gray-100">
                    <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="text-xl font-black text-gray-950 uppercase italic tracking-tighter">Tạo chi phí mới</h3>
                        <button onClick={handleClose} className="text-gray-400 hover:text-gray-950 transition-colors" disabled={isSubmitting}>
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit(handleFormSubmit)}>
                        <div className="px-8 py-6 space-y-5 max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Danh mục *</label>
                                    <select
                                        {...register('categoryId')}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-[#D70018] font-bold text-sm"
                                        disabled={isSubmitting}
                                    >
                                        <option value="">Chọn danh mục</option>
                                        {categories.filter(c => c.isActive).map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name} ({cat.code})</option>
                                        ))}
                                    </select>
                                    {errors.categoryId && <p className="mt-1 text-xs text-red-500">{errors.categoryId.message}</p>}
                                </div>

                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Mô tả *</label>
                                    <input
                                        type="text"
                                        {...register('description')}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-[#D70018] font-medium text-sm"
                                        placeholder="Nhập mô tả chi phí..."
                                        disabled={isSubmitting}
                                    />
                                    {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Số tiền *</label>
                                    <input
                                        type="number"
                                        {...register('amount', { valueAsNumber: true })}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-[#D70018] font-black text-lg text-[#D70018]"
                                        placeholder="0"
                                        disabled={isSubmitting}
                                    />
                                    {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">VAT (%)</label>
                                    <input
                                        type="number"
                                        {...register('vatRate', { valueAsNumber: true })}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-[#D70018] font-bold text-sm"
                                        placeholder="10"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Ngày chi</label>
                                    <input
                                        type="date"
                                        {...register('expenseDate')}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-[#D70018] font-medium text-sm"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Tiền tệ</label>
                                    <select
                                        {...register('currency')}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-[#D70018] font-bold text-sm"
                                        disabled={isSubmitting}
                                    >
                                        <option value="VND">VND</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Ghi chú</label>
                                    <textarea
                                        {...register('notes')}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-[#D70018] font-medium text-sm min-h-[80px]"
                                        placeholder="Ghi chú thêm..."
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="bg-gray-950 text-white p-6 rounded-2xl space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400 uppercase text-[10px] font-black tracking-widest">Số tiền</span>
                                    <span className="font-black">{formatCurrency(amount || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400 uppercase text-[10px] font-black tracking-widest">VAT ({vatRate}%)</span>
                                    <span className="font-black">{formatCurrency(vatAmount || 0)}</span>
                                </div>
                                <div className="flex justify-between text-lg pt-3 border-t border-white/10">
                                    <span className="text-gray-400 uppercase text-xs font-black tracking-widest">Tổng cộng</span>
                                    <span className="font-black text-[#D70018] text-2xl italic">{formatCurrency(totalAmount || 0)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-gray-50 border-t flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-6 py-3 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:text-gray-950 transition-all"
                                disabled={isSubmitting}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-3 bg-[#D70018] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-red-500/20 hover:bg-[#b50014] transition-all active:scale-95 disabled:opacity-50"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Đang tạo...' : 'Tạo chi phí'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export const ExpensesPage = () => {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const pageSize = 20;

    // Queries
    const { data: categoriesData } = useQuery({
        queryKey: ['expense-categories'],
        queryFn: () => expenseApi.categories.getAll(),
    });

    const { data: expensesData, isLoading } = useQuery({
        queryKey: ['expenses', page, statusFilter, categoryFilter],
        queryFn: () => expenseApi.getList({
            page,
            pageSize,
            status: statusFilter === 'all' ? undefined : statusFilter,
            categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
        }),
    });

    const { data: summary } = useQuery({
        queryKey: ['expenses-summary'],
        queryFn: () => expenseApi.getSummary(),
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: CreateExpenseRequest) => expenseApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
            setIsCreateModalOpen(false);
            toast.success('Tạo chi phí thành công');
        },
        onError: () => {
            toast.error('Có lỗi xảy ra');
        },
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => expenseApi.approve(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
            toast.success('Duyệt chi phí thành công');
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => expenseApi.reject(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
            toast.success('Từ chối chi phí');
        },
    });

    const payMutation = useMutation({
        mutationFn: ({ id, method }: { id: string; method: string }) => expenseApi.pay(id, method),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
            toast.success('Ghi nhận thanh toán');
        },
    });

    const handleApprove = (id: string) => {
        if (confirm('Xác nhận duyệt chi phí này?')) {
            approveMutation.mutate(id);
        }
    };

    const handleReject = (id: string) => {
        const reason = prompt('Lý do từ chối:');
        if (reason) {
            rejectMutation.mutate({ id, reason });
        }
    };

    const handlePay = (id: string) => {
        const method = prompt('Phương thức thanh toán (Cash, BankTransfer, Card):') || 'Cash';
        payMutation.mutate({ id, method });
    };

    const getStatusBadge = (status: ExpenseStatus) => {
        const configs: Record<ExpenseStatus, { label: string; bg: string; text: string }> = {
            Pending: { label: 'Chờ duyệt', bg: 'bg-amber-50', text: 'text-amber-600' },
            Approved: { label: 'Đã duyệt', bg: 'bg-blue-50', text: 'text-blue-600' },
            Rejected: { label: 'Từ chối', bg: 'bg-red-50', text: 'text-red-600' },
            Paid: { label: 'Đã thanh toán', bg: 'bg-green-50', text: 'text-green-600' },
        };
        const config = configs[status];
        return (
            <span className={`px-3 py-1 ${config.bg} ${config.text} rounded-lg text-[9px] font-black uppercase tracking-widest border border-current opacity-80`}>
                {config.label}
            </span>
        );
    };

    const columns: Column<Expense>[] = [
        {
            key: 'expenseNumber',
            label: 'Mã chi phí',
            sortable: true,
            render: (item) => <span className="font-black text-[#D70018] font-mono text-xs">{item.expenseNumber}</span>,
        },
        {
            key: 'categoryName',
            label: 'Danh mục',
            sortable: true,
            render: (item) => <span className="font-bold text-gray-700 text-xs uppercase">{item.categoryName}</span>,
        },
        {
            key: 'description',
            label: 'Mô tả',
            render: (item) => <span className="text-sm text-gray-600 line-clamp-1">{item.description}</span>,
        },
        {
            key: 'totalAmount',
            label: 'Tổng tiền',
            sortable: true,
            render: (item) => <span className="font-black text-gray-950 tracking-tighter">{formatCurrency(item.totalAmount)}</span>,
        },
        {
            key: 'expenseDate',
            label: 'Ngày chi',
            sortable: true,
            render: (item) => (
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    {new Date(item.expenseDate).toLocaleDateString('vi-VN')}
                </span>
            ),
        },
        {
            key: 'status',
            label: 'Trạng thái',
            sortable: true,
            render: (item) => getStatusBadge(item.status),
        },
    ];

    const categories = categoriesData || [];
    const expenses = expensesData?.expenses || [];
    const total = expensesData?.total || 0;

    const statusFilters: { key: ExpenseStatus | 'all'; label: string }[] = [
        { key: 'all', label: 'Tất cả' },
        { key: 'Pending', label: 'Chờ duyệt' },
        { key: 'Approved', label: 'Đã duyệt' },
        { key: 'Paid', label: 'Đã thanh toán' },
        { key: 'Rejected', label: 'Từ chối' },
    ];

    return (
        <div className="space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Quản lý <span className="text-[#D70018]">Chi phí</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                        Theo dõi và phê duyệt các khoản chi phí
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-8 py-4 bg-gray-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#D70018] transition-all shadow-xl flex items-center gap-3"
                >
                    <Plus size={16} />
                    Tạo chi phí
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div whileHover={{ y: -5 }} className="premium-card p-8 border-2 border-gray-50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gray-50 text-gray-600 rounded-2xl">
                            <Wallet size={24} />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tổng chi</span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{formatCurrency(summary?.totalExpenses || 0)}</h3>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="premium-card p-8 border-2 border-amber-50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                            <Clock size={24} />
                        </div>
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Chờ duyệt</span>
                    </div>
                    <h3 className="text-2xl font-black text-amber-600 tracking-tighter">{summary?.pendingCount || 0}</h3>
                    <p className="text-xs text-gray-400 mt-1">{formatCurrency(summary?.pendingAmount || 0)}</p>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="premium-card p-8 border-2 border-blue-50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <CheckCircle size={24} />
                        </div>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Đã duyệt</span>
                    </div>
                    <h3 className="text-2xl font-black text-blue-600 tracking-tighter">{summary?.approvedCount || 0}</h3>
                    <p className="text-xs text-gray-400 mt-1">{formatCurrency(summary?.approvedAmount || 0)}</p>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="premium-card p-8 border-2 border-green-50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                            <CreditCard size={24} />
                        </div>
                        <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Đã chi</span>
                    </div>
                    <h3 className="text-2xl font-black text-green-600 tracking-tighter">{summary?.paidCount || 0}</h3>
                    <p className="text-xs text-gray-400 mt-1">{formatCurrency(summary?.paidAmount || 0)}</p>
                </motion.div>
            </div>

            {/* Filters */}
            <div className="premium-card p-6 border-2 bg-white">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-400" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lọc:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {statusFilters.map((filter) => (
                            <button
                                key={filter.key}
                                onClick={() => setStatusFilter(filter.key)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                                    statusFilter === filter.key
                                        ? 'bg-gray-950 text-white border-gray-950'
                                        : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                                }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-2 rounded-xl text-xs font-bold border-2 border-gray-100 focus:border-[#D70018] focus:ring-0"
                    >
                        <option value="all">Tất cả danh mục</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="premium-card p-4 border-2 shadow-2xl shadow-gray-200/50">
                <div className="p-4">
                    <DataTable
                        columns={columns}
                        data={expenses}
                        total={total}
                        page={page}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        isLoading={isLoading}
                        actions={(item) => (
                            <div className="flex gap-2 justify-end">
                                {item.status === 'Pending' && (
                                    <>
                                        <button
                                            onClick={() => handleApprove(item.id)}
                                            className="px-4 py-2 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-all"
                                        >
                                            Duyệt
                                        </button>
                                        <button
                                            onClick={() => handleReject(item.id)}
                                            className="px-4 py-2 bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-100 transition-all"
                                        >
                                            Từ chối
                                        </button>
                                    </>
                                )}
                                {item.status === 'Approved' && (
                                    <button
                                        onClick={() => handlePay(item.id)}
                                        className="px-4 py-2 bg-green-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-green-700 transition-all"
                                    >
                                        Thanh toán
                                    </button>
                                )}
                                {item.status === 'Paid' && (
                                    <span className="px-4 py-2 bg-gray-100 text-gray-400 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                        Hoàn tất
                                    </span>
                                )}
                            </div>
                        )}
                    />
                </div>
            </div>

            {/* Category Breakdown */}
            {summary?.byCategory && summary.byCategory.length > 0 && (
                <div className="premium-card p-8 border-2">
                    <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tighter mb-6">Chi phí theo danh mục</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {summary.byCategory.map((cat) => (
                            <div key={cat.categoryId} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs font-black text-gray-700 uppercase tracking-widest">{cat.categoryName}</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{cat.categoryCode}</span>
                                </div>
                                <p className="text-xl font-black text-[#D70018] tracking-tighter">{formatCurrency(cat.totalAmount)}</p>
                                <p className="text-[10px] text-gray-400 mt-1">{cat.expenseCount} khoản chi</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Expense Modal */}
            <CreateExpenseModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                categories={categories}
                onSubmit={async (data) => {
                    await createMutation.mutateAsync(data);
                }}
                isSubmitting={createMutation.isPending}
            />
        </div>
    );
};

export { ExpensesPage as default };
