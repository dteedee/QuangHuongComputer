import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileText, DollarSign, Clock, CheckCircle, X, Plus } from 'lucide-react';
import { accountingApi, type APInvoice, type InvoiceStatus } from '../../../api/accounting';
import { DataTable, type Column } from '../../../components/crud/DataTable';
import { useCrudList, type QueryParams } from '../../../hooks/useCrudList';
import { formatCurrency } from '../../../utils/format';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

type StatusFilter = 'all' | InvoiceStatus | 'paid_partially';

// Payment Modal
interface PaymentModalProps {
    invoice: APInvoice | null;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { amount: number; paymentMethod: string; reference?: string }) => Promise<void>;
    isSubmitting: boolean;
}

function PaymentModal({ invoice, isOpen, onClose, onSubmit, isSubmitting }: PaymentModalProps) {
    const [amount, setAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('BankTransfer');
    const [reference, setReference] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({ amount, paymentMethod, reference });
        setAmount(0);
        setReference('');
    };

    if (!isOpen || !invoice) return null;

    const isOverLimit = amount > invoice.outstandingAmount;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                        <h3 className="text-lg font-bold text-gray-900 uppercase italic">Thanh toán NCC</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors" disabled={isSubmitting}>
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="px-6 py-4 space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Mã hóa đơn</span>
                                    <span className="font-black text-gray-950 font-mono">{invoice.invoiceNumber}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Còn nợ</span>
                                    <span className="font-black text-[#D70018] text-xl">{formatCurrency(invoice.outstandingAmount)}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Số tiền thanh toán
                                </label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-[#D70018] font-black text-xl text-[#D70018]"
                                    placeholder="0"
                                    disabled={isSubmitting}
                                />
                                {isOverLimit && (
                                    <p className="mt-2 text-xs text-red-500 font-bold">Không thể thanh toán vượt quá số tiền nợ</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Phương thức thanh toán
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-[#D70018] font-bold text-sm"
                                    disabled={isSubmitting}
                                >
                                    <option value="BankTransfer">Chuyển khoản</option>
                                    <option value="Cash">Tiền mặt</option>
                                    <option value="Card">Thẻ</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Tham chiếu / Ghi chú
                                </label>
                                <input
                                    type="text"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-[#D70018] font-medium text-sm"
                                    placeholder="Mã giao dịch, chứng từ..."
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:text-gray-900"
                                disabled={isSubmitting}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2.5 bg-[#D70018] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-[#b50014] transition-all disabled:opacity-50"
                                disabled={isSubmitting || isOverLimit || amount <= 0}
                            >
                                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Create AP Invoice Modal
const createInvoiceSchema = z.object({
    supplierId: z.string().min(1, 'Vui lòng nhập mã NCC'),
    dueDate: z.string(),
    vatRate: z.number().min(0).max(100),
    currency: z.string(),
    notes: z.string().optional(),
    lines: z.array(z.object({
        description: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().positive(),
        vatRate: z.number().min(0),
    })).min(1, 'Cần ít nhất 1 dòng'),
});

type CreateInvoiceFormData = z.infer<typeof createInvoiceSchema>;

interface CreateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateInvoiceFormData) => Promise<void>;
    isSubmitting: boolean;
}

function CreateInvoiceModal({ isOpen, onClose, onSubmit, isSubmitting }: CreateInvoiceModalProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        control,
        watch,
    } = useForm<CreateInvoiceFormData>({
        resolver: zodResolver(createInvoiceSchema),
        defaultValues: {
            supplierId: '',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            vatRate: 10,
            currency: 'VND',
            notes: '',
            lines: [{ description: '', quantity: 1, unitPrice: 0, vatRate: 10 }],
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
    const lines = watch('lines');

    const subtotal = lines.reduce((sum, line) => sum + (line.quantity || 0) * (line.unitPrice || 0), 0);
    const vatTotal = lines.reduce((sum, line) => {
        const lineTotal = (line.quantity || 0) * (line.unitPrice || 0);
        return sum + lineTotal * (line.vatRate || 0) / 100;
    }, 0);
    const total = subtotal + vatTotal;

    const handleFormSubmit = async (data: CreateInvoiceFormData) => {
        await onSubmit(data);
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

                <div className="inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <div className="flex items-center justify-between px-8 py-6 border-b bg-gray-50">
                        <h3 className="text-xl font-black text-gray-950 uppercase italic tracking-tighter">Tạo hóa đơn NCC</h3>
                        <button onClick={handleClose} className="text-gray-400 hover:text-gray-950 transition-colors" disabled={isSubmitting}>
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit(handleFormSubmit)}>
                        <div className="px-8 py-6 space-y-5 max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Mã NCC *</label>
                                    <input
                                        type="text"
                                        {...register('supplierId')}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-[#D70018] font-bold text-sm"
                                        placeholder="NCC-001"
                                        disabled={isSubmitting}
                                    />
                                    {errors.supplierId && <p className="mt-1 text-xs text-red-500">{errors.supplierId.message}</p>}
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Hạn thanh toán</label>
                                    <input
                                        type="date"
                                        {...register('dueDate')}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-[#D70018] font-medium text-sm"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">VAT mặc định (%)</label>
                                    <input
                                        type="number"
                                        {...register('vatRate', { valueAsNumber: true })}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-[#D70018] font-bold text-sm"
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
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Ghi chú</label>
                                <textarea
                                    {...register('notes')}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:ring-0 focus:border-[#D70018] font-medium text-sm min-h-[60px]"
                                    placeholder="Ghi chú cho hóa đơn..."
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Line Items */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Danh sách hàng hóa</label>
                                    <button
                                        type="button"
                                        onClick={() => append({ description: '', quantity: 1, unitPrice: 0, vatRate: 10 })}
                                        className="px-3 py-1.5 bg-gray-100 text-gray-600 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Thêm dòng
                                    </button>
                                </div>

                                {fields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-xl">
                                        <div className="col-span-5">
                                            <input
                                                {...register(`lines.${index}.description`)}
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium"
                                                placeholder="Mô tả"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-center"
                                                placeholder="SL"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <input
                                                type="number"
                                                {...register(`lines.${index}.unitPrice`, { valueAsNumber: true })}
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-right"
                                                placeholder="Đơn giá"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <input
                                                type="number"
                                                {...register(`lines.${index}.vatRate`, { valueAsNumber: true })}
                                                className="w-full px-2 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-center"
                                                placeholder="%"
                                            />
                                        </div>
                                        <div className="col-span-1 flex items-center justify-center">
                                            {fields.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => remove(index)}
                                                    className="text-red-400 hover:text-red-600"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {errors.lines && <p className="text-xs text-red-500">{errors.lines.message}</p>}
                            </div>

                            {/* Summary */}
                            <div className="bg-gray-950 text-white p-6 rounded-2xl space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400 uppercase text-[10px] font-black tracking-widest">Tiền hàng</span>
                                    <span className="font-black">{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400 uppercase text-[10px] font-black tracking-widest">VAT</span>
                                    <span className="font-black">{formatCurrency(vatTotal)}</span>
                                </div>
                                <div className="flex justify-between text-lg pt-3 border-t border-white/10">
                                    <span className="text-gray-400 uppercase text-xs font-black tracking-widest">Tổng cộng</span>
                                    <span className="font-black text-[#D70018] text-2xl italic">{formatCurrency(total)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-gray-50 border-t flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-6 py-3 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:text-gray-950"
                                disabled={isSubmitting}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-3 bg-[#D70018] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl hover:bg-[#b50014] transition-all disabled:opacity-50"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Đang tạo...' : 'Tạo hóa đơn'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export const APPage = () => {
    const queryClient = useQueryClient();
    const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
    const [selectedInvoice, setSelectedInvoice] = useState<APInvoice | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const {
        data,
        total,
        page,
        pageSize,
        isLoading,
        handlePageChange,
        handleSearch,
        search,
    } = useCrudList<APInvoice>({
        queryKey: ['ap-invoices'],
        fetchFn: async (params: QueryParams) => {
            const result = await accountingApi.ap.getList(params.page, params.pageSize);
            return {
                ...result,
                totalPages: Math.ceil(result.total / result.pageSize),
                hasPreviousPage: result.page > 1,
                hasNextPage: result.page < Math.ceil(result.total / result.pageSize),
            };
        },
        initialPageSize: 20,
    });

    const filteredData = useMemo(() => {
        if (selectedStatus === 'all') return data;
        return data.filter((invoice) => invoice.status === selectedStatus);
    }, [data, selectedStatus]);

    const paymentMutation = useMutation({
        mutationFn: ({ id, amount, paymentMethod, reference }: { id: string; amount: number; paymentMethod: string; reference?: string }) =>
            accountingApi.ap.applyPayment(id, { amount, paymentMethod, reference }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ap-invoices'] });
            setIsPaymentModalOpen(false);
            setSelectedInvoice(null);
            toast.success('Ghi nhận thanh toán thành công');
        },
        onError: () => {
            toast.error('Có lỗi xảy ra');
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: CreateInvoiceFormData) => accountingApi.ap.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ap-invoices'] });
            setIsCreateModalOpen(false);
            toast.success('Tạo hóa đơn thành công');
        },
        onError: () => {
            toast.error('Có lỗi xảy ra');
        },
    });

    const handlePayment = async (data: { amount: number; paymentMethod: string; reference?: string }) => {
        if (!selectedInvoice) return;
        await paymentMutation.mutateAsync({ id: selectedInvoice.id, ...data });
    };

    const openPaymentModal = (invoice: APInvoice) => {
        setSelectedInvoice(invoice);
        setIsPaymentModalOpen(true);
    };

    const getStatusBadge = (status: InvoiceStatus) => {
        switch (status) {
            case 'Draft':
                return <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-black uppercase">Bản nháp</span>;
            case 'Issued':
                return <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-black uppercase">Chờ xử lý</span>;
            case 'Paid':
                return <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-black uppercase">Đã thanh toán</span>;
            case 'Overdue':
                return <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-black uppercase">Quá hạn</span>;
            case 'Cancelled':
                return <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-xs font-black uppercase">Đã hủy</span>;
            default:
                return null;
        }
    };

    const columns: Column<APInvoice>[] = [
        {
            key: 'invoiceNumber',
            label: 'Mã hóa đơn',
            sortable: true,
            render: (item) => <span className="font-black text-[#D70018] font-mono">{item.invoiceNumber}</span>,
        },
        {
            key: 'supplierId',
            label: 'Mã nhà cung cấp',
            sortable: true,
            render: (item) => <span className="font-medium text-gray-900">{item.supplierId}</span>,
        },
        {
            key: 'totalAmount',
            label: 'Tổng tiền',
            sortable: true,
            render: (item) => <span className="font-bold text-gray-900">{formatCurrency(item.totalAmount)}</span>,
        },
        {
            key: 'outstandingAmount',
            label: 'Còn nợ',
            sortable: true,
            render: (item) => <span className="font-bold text-red-600">{formatCurrency(item.outstandingAmount)}</span>,
        },
        {
            key: 'dueDate',
            label: 'Hạn thanh toán',
            sortable: true,
            render: (item) => (
                <span className="text-sm text-gray-600">{new Date(item.dueDate).toLocaleDateString('vi-VN')}</span>
            ),
        },
        {
            key: 'status',
            label: 'Trạng thái',
            sortable: true,
            render: (item) => getStatusBadge(item.status),
        },
    ];

    const statusFilters: { key: StatusFilter; label: string; count: number }[] = [
        { key: 'all', label: 'Tất cả', count: data.length },
        { key: 'Issued', label: 'Chờ xử lý', count: data.filter((d) => d.status === 'Issued').length },
        { key: 'Paid', label: 'Đã trả', count: data.filter((d) => d.status === 'Paid').length },
        { key: 'Overdue', label: 'Quá hạn', count: data.filter((d) => d.status === 'Overdue').length },
    ];

    const totalAmount = data.reduce((sum, item) => sum + item.totalAmount, 0);
    const outstandingAmount = data.reduce((sum, item) => sum + item.outstandingAmount, 0);
    const overdueAmount = data.filter(d => d.status === 'Overdue').reduce((sum, item) => sum + item.totalAmount, 0);

    return (
        <div className="space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Công nợ <span className="text-[#D70018]">phải trả</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                        Quản lý hóa đơn và thanh toán nhà cung cấp (AP)
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-8 py-4 bg-gray-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#D70018] transition-all shadow-xl flex items-center gap-3"
                >
                    <Plus size={16} />
                    Tạo hóa đơn
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <DollarSign size={24} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Tổng số tiền nợ</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{formatCurrency(outstandingAmount)}</h3>
                    <p className="text-xs text-gray-400 font-bold mt-2">Trên tổng {formatCurrency(totalAmount)} hóa đơn</p>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                            <Clock size={24} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Đang chờ xử lý</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
                        {data.filter((d) => d.status === 'Issued').length}
                    </h3>
                    <p className="text-xs text-gray-400 font-bold mt-2">Hóa đơn chờ thanh toán</p>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="premium-card p-8 border-red-100 bg-red-50/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                            <CheckCircle size={24} />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Quá hạn thanh toán</span>
                    </div>
                    <h3 className="text-3xl font-black text-red-600 tracking-tighter">{formatCurrency(overdueAmount)}</h3>
                    <p className="text-xs text-red-400 font-bold mt-2">Cần ưu tiên xử lý</p>
                </motion.div>
            </div>

            {/* Status Filter */}
            <div className="premium-card p-6">
                <h3 className="text-sm font-black text-gray-700 uppercase mb-4">Lọc theo trạng thái</h3>
                <div className="flex flex-wrap gap-3">
                    {statusFilters.map((filter) => (
                        <button
                            key={filter.key}
                            onClick={() => setSelectedStatus(filter.key)}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${selectedStatus === filter.key
                                ? 'bg-[#D70018] text-white'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {filter.label} ({filter.count})
                        </button>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div className="premium-card p-4 border-2 shadow-2xl shadow-gray-200/50">
                <div className="p-6 border-b border-gray-50 flex items-center gap-4">
                    <div className="flex-1 relative">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                            <SearchIcon size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo mã hóa đơn, nhà cung cấp..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#D70018] rounded-2xl text-sm font-black uppercase tracking-tighter italic placeholder-gray-400 text-gray-900 transition-all"
                        />
                    </div>
                </div>

                <div className="p-4">
                    <DataTable
                        columns={columns}
                        data={filteredData}
                        total={total}
                        page={page}
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                        isLoading={isLoading}
                        actions={(item) => (
                            <div className="flex gap-2 justify-end">
                                {(item.status === 'Issued' || item.status === 'Overdue') && item.outstandingAmount > 0 && (
                                    <button
                                        onClick={() => openPaymentModal(item)}
                                        className="px-6 py-2.5 bg-gray-950 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#D70018] transition-all active:scale-95 shadow-lg shadow-gray-200"
                                    >
                                        Thanh toán
                                    </button>
                                )}
                                {item.status === 'Paid' && (
                                    <span className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-gray-200">
                                        Hoàn tất
                                    </span>
                                )}
                            </div>
                        )}
                    />
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                invoice={selectedInvoice}
                isOpen={isPaymentModalOpen}
                onClose={() => {
                    setIsPaymentModalOpen(false);
                    setSelectedInvoice(null);
                }}
                onSubmit={handlePayment}
                isSubmitting={paymentMutation.isPending}
            />

            {/* Create Invoice Modal */}
            <CreateInvoiceModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={async (data) => {
                    await createMutation.mutateAsync(data);
                }}
                isSubmitting={createMutation.isPending}
            />
        </div>
    );
};

const SearchIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.3-4.3"></path>
    </svg>
);
