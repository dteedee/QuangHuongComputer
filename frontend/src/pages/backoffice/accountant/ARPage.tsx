import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { DollarSign, Clock, AlertCircle, X } from 'lucide-react';
import { accountingApi, type ARInvoice, type InvoiceStatus, type AgingBucket } from '../../../api/accounting';
import { DataTable, type Column } from '../../../components/crud/DataTable';
import { useCrudList, type QueryParams } from '../../../hooks/useCrudList';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatCurrency } from '../../../utils/format';

const paymentSchema = z.object({
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

type AgingFilter = 'all' | AgingBucket;

interface PaymentModalProps {
  invoice: ARInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { amount: number; notes?: string }) => Promise<void>;
  isSubmitting: boolean;
}

function PaymentModal({ invoice, isOpen, onClose, onSubmit, isSubmitting }: PaymentModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: 0, notes: '' },
  });

  const amount = watch('amount');
  const isOverLimit = invoice ? amount > invoice.outstandingAmount : false;

  const handleFormSubmit = async (data: PaymentFormData) => {
    if (isOverLimit) return;
    await onSubmit(data);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-bold text-gray-900 uppercase italic">Ghi nhận thanh toán</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
              disabled={isSubmitting}
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-gray-50 p-6 rounded-2xl space-y-3 border-2 border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Mã hóa đơn</span>
                  <span className="font-black text-gray-950 font-mono tracking-tighter">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Khách hàng</span>
                  <span className="font-black text-gray-950 text-right">{invoice.customerId}</span>
                </div>
                <div className="flex justify-between text-sm border-t-2 border-dashed border-gray-200 pt-3">
                  <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Dư nợ hiện tại</span>
                  <span className="font-black text-[#D70018] text-xl tracking-tighter italic">
                    {formatCurrency(invoice.outstandingAmount)}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    Số tiền thanh toán
                  </label>
                  <input
                    type="number"
                    {...register('amount', { valueAsNumber: true })}
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-0 focus:border-[#D70018] font-black text-2xl tracking-tighter italic text-[#D70018] placeholder-gray-300 transition-all"
                    placeholder="0"
                    disabled={isSubmitting}
                  />
                  {errors.amount && (
                    <p className="mt-2 text-xs font-bold text-red-600 uppercase tracking-widest">{errors.amount.message}</p>
                  )}
                  {isOverLimit && (
                    <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100">
                      <AlertCircle size={14} />
                      <span>Không thể thanh toán vượt quá số tiền nợ</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    Ghi chú
                  </label>
                  <textarea
                    {...register('notes')}
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-0 focus:border-[#D70018] font-medium text-sm placeholder-gray-300 transition-all min-h-[100px]"
                    placeholder="Nhập ghi chú thanh toán..."
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-6 bg-gray-50 border-t flex justify-end gap-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-100 transition-all active:scale-95"
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-[#D70018] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-red-500/20 hover:bg-[#b50014] transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                disabled={isSubmitting || isOverLimit}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận thu nợ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export const ARPage = () => {
  const queryClient = useQueryClient();
  const [selectedAgingBucket, setSelectedAgingBucket] = useState<AgingFilter>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<ARInvoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const {
    data,
    total,
    page,
    pageSize,
    isLoading,
    handlePageChange,
    handleSearch,
    search,
  } = useCrudList<ARInvoice>({
    queryKey: ['ar-invoices', selectedAgingBucket],
    fetchFn: async (params: QueryParams) => {
      const result = await accountingApi.ar.getList(params.page, params.pageSize, selectedAgingBucket === 'all' ? undefined : selectedAgingBucket);
      return {
        ...result,
        totalPages: Math.ceil(result.total / result.pageSize),
        hasPreviousPage: result.page > 1,
        hasNextPage: result.page < Math.ceil(result.total / result.pageSize),
      };
    },
    initialPageSize: 20,
  });

  const applyPaymentMutation = useMutation({
    mutationFn: ({ invoiceId, amount, notes }: { invoiceId: string; amount: number; notes?: string }) =>
      accountingApi.ar.applyPayment(invoiceId, { amount, notes, paymentIntentId: 'manual' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ar-invoices'] });
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
    },
  });

  const handleApplyPayment = async (data: { amount: number; notes?: string }) => {
    if (!selectedInvoice) return;
    await applyPaymentMutation.mutateAsync({
      invoiceId: selectedInvoice.id,
      amount: data.amount,
      notes: data.notes,
    });
  };

  const openPaymentModal = (invoice: ARInvoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentModalOpen(true);
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    const configs: Record<InvoiceStatus, { label: string; bg: string; text: string }> = {
      Draft: { label: 'Bản nháp', bg: 'bg-gray-50', text: 'text-gray-400' },
      Issued: { label: 'Chờ thu', bg: 'bg-amber-50', text: 'text-amber-600' },
      Paid: { label: 'Đã thu', bg: 'bg-green-50', text: 'text-green-600' },
      Overdue: { label: 'Quá hạn', bg: 'bg-red-50', text: 'text-red-600' },
      Cancelled: { label: 'Đã hủy', bg: 'bg-gray-100', text: 'text-gray-400' },
    };
    const config = configs[status] || configs.Draft;
    return (
      <span className={`px-3 py-1 ${config.bg} ${config.text} rounded-lg text-[9px] font-black uppercase tracking-widest border border-current opacity-70`}>
        {config.label}
      </span>
    );
  };

  const columns: Column<ARInvoice>[] = [
    {
      key: 'invoiceNumber',
      label: 'Mã hóa đơn',
      sortable: true,
      render: (item) => (
        <span className="font-black text-[#D70018] font-mono tracking-tighter">{item.invoiceNumber}</span>
      ),
    },
    {
      key: 'customerId',
      label: 'Khách hàng',
      sortable: true,
      render: (item) => <span className="font-black text-gray-900 uppercase italic text-xs">{item.customerId}</span>,
    },
    {
      key: 'totalAmount',
      label: 'Tổng tiền',
      sortable: true,
      render: (item) => (
        <span className="font-black text-gray-900 tracking-tighter">{formatCurrency(item.totalAmount)}</span>
      ),
    },
    {
      key: 'outstandingAmount',
      label: 'Còn nợ',
      sortable: true,
      render: (item) => (
        <span className="font-black text-[#D70018] tracking-tighter italic">{formatCurrency(item.outstandingAmount)}</span>
      ),
    },
    {
      key: 'dueDate',
      label: 'Hạn thanh toán',
      sortable: true,
      render: (item) => (
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
          {new Date(item.dueDate).toLocaleDateString('vi-VN')}
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

  const agingBuckets: { key: AgingFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'Current', label: 'Trong hạn' },
    { key: 'Days1To30', label: '1-30 ngày' },
    { key: 'Days31To60', label: '31-60 ngày' },
    { key: 'Days61To90', label: '61-90 ngày' },
    { key: 'Over90Days', label: '90+ ngày' },
  ];

  const totalOutstanding = data.reduce((sum, item) => sum + item.outstandingAmount, 0);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
            Quản lý <span className="text-[#D70018]">Công nợ phải thu</span>
          </h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">
            Theo dõi khoản thu từ khách hàng đại lý (AR)
          </p>
        </div>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div whileHover={{ y: -5 }} className="premium-card p-10 group border-2 border-red-50">
          <div className="absolute top-0 right-0 p-8 text-red-500/5 group-hover:scale-125 transition-transform duration-700">
            <DollarSign size={120} />
          </div>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3 italic">Tổng nợ chưa thu</p>
          <h3 className="text-4xl font-black text-[#D70018] tracking-tighter italic">
            {formatCurrency(totalOutstanding)}
          </h3>
          <div className="mt-8 pt-6 border-t-2 border-gray-50 flex items-center gap-3">
            <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Trên {data.length} hóa đơn</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="premium-card p-10 group border-2 border-amber-50">
          <div className="absolute top-0 right-0 p-8 text-amber-500/5 group-hover:scale-125 transition-transform duration-700">
            <Clock size={120} />
          </div>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3 italic">Hóa đơn quá hạn</p>
          <h3 className="text-4xl font-black text-amber-600 tracking-tighter italic">
            {data.filter((d) => d.status === 'Overdue').length}
          </h3>
          <div className="mt-8 pt-6 border-t-2 border-gray-50">
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest italic animate-pulse">Cần ưu tiên thu nợ</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="premium-card p-10 group border-2 border-blue-50">
          <div className="absolute top-0 right-0 p-8 text-blue-500/5 group-hover:scale-125 transition-transform duration-700">
            <AlertCircle size={120} />
          </div>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3 italic">Hóa đơn trong hạn</p>
          <h3 className="text-4xl font-black text-blue-600 tracking-tighter italic">
            {data.filter((d) => d.status === 'Issued').length}
          </h3>
          <div className="mt-8 pt-6 border-t-2 border-gray-50">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Dòng tiền ổn định</span>
          </div>
        </motion.div>
      </div>

      {/* Aging Filters */}
      <div className="premium-card p-8 border-2 bg-white">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 italic">Phân tích tuổi nợ</h3>
        <div className="flex flex-wrap gap-3">
          {agingBuckets.map((bucket) => (
            <button
              key={bucket.key}
              onClick={() => setSelectedAgingBucket(bucket.key)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${selectedAgingBucket === bucket.key
                  ? 'bg-gray-950 text-white border-gray-950 shadow-xl'
                  : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                }`}
            >
              {bucket.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Table */}
      <div className="premium-card p-4 border-2 shadow-2xl shadow-gray-200/50">
        <div className="p-6 border-b border-gray-50 flex items-center gap-4">
          <div className="flex-1 relative">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã hóa đơn, khách hàng..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#D70018] rounded-2xl text-sm font-black uppercase tracking-tighter italic placeholder-gray-300 transition-all"
            />
          </div>
        </div>

        <div className="p-4">
          <DataTable
            columns={columns}
            data={data}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            isLoading={isLoading}
            actions={(item) => (
              <button
                onClick={() => openPaymentModal(item)}
                disabled={item.outstandingAmount <= 0}
                className="px-6 py-2.5 bg-gray-950 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#D70018] transition-all disabled:opacity-30 active:scale-95 shadow-lg shadow-gray-200"
              >
                Ghi nhận thu nợ
              </button>
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
        onSubmit={handleApplyPayment}
        isSubmitting={applyPaymentMutation.isPending}
      />
    </div>
  );
};

const Search = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.3-4.3"></path>
  </svg>
);
