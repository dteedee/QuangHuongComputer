import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { DollarSign, Clock, AlertCircle, X } from 'lucide-react';
import { accountingApi, ARInvoice } from '../../../api/accounting';
import { DataTable, Column } from '../../../components/crud/DataTable';
import { useCrudList } from '../../../hooks/useCrudList';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const paymentSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

type AgingBucket = 'all' | 'current' | '30' | '60' | '90' | '120+';

interface PaymentModalProps {
  invoice: ARInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
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
    defaultValues: { amount: 0 },
  });

  const amount = watch('amount');
  const isOverLimit = invoice ? amount > invoice.outstanding : false;

  const handleFormSubmit = async (data: PaymentFormData) => {
    if (isOverLimit) return;
    await onSubmit(data.amount);
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
            <h3 className="text-lg font-bold text-gray-900 uppercase">Apply Payment</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500"
              disabled={isSubmitting}
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Invoice Number:</span>
                  <span className="font-bold text-gray-900">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Customer:</span>
                  <span className="font-bold text-gray-900">{invoice.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Total Amount:</span>
                  <span className="font-bold text-gray-900">
                    ${invoice.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-gray-600 font-medium">Outstanding:</span>
                  <span className="font-bold text-[#D70018] text-lg">
                    ${invoice.outstanding.toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('amount', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                )}
                {isOverLimit && (
                  <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle size={16} />
                    <span>Payment amount cannot exceed outstanding balance</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500">
                Maximum payment: ${invoice.outstanding.toLocaleString()}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || isOverLimit}
              >
                {isSubmitting ? 'Processing...' : 'Apply Payment'}
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
  const [selectedAgingBucket, setSelectedAgingBucket] = useState<AgingBucket>('all');
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
    refetch,
  } = useCrudList<ARInvoice>({
    queryKey: ['ar-invoices'],
    fetchFn: accountingApi.getARList,
    initialPageSize: 20,
  });

  const applyPaymentMutation = useMutation({
    mutationFn: ({ invoiceId, amount }: { invoiceId: string; amount: number }) =>
      accountingApi.applyPayment(invoiceId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ar-invoices'] });
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
    },
  });

  const handleApplyPayment = async (amount: number) => {
    if (!selectedInvoice) return;
    await applyPaymentMutation.mutateAsync({
      invoiceId: selectedInvoice.id,
      amount,
    });
  };

  const openPaymentModal = (invoice: ARInvoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentModalOpen(true);
  };

  const filteredData = useMemo(() => {
    if (selectedAgingBucket === 'all') return data;

    return data.filter((invoice) => {
      const days = invoice.agingDays;
      switch (selectedAgingBucket) {
        case 'current':
          return days >= 0 && days < 30;
        case '30':
          return days >= 30 && days < 60;
        case '60':
          return days >= 60 && days < 90;
        case '90':
          return days >= 90 && days < 120;
        case '120+':
          return days >= 120;
        default:
          return true;
      }
    });
  }, [data, selectedAgingBucket]);

  const getAgingBadge = (agingDays: number) => {
    if (agingDays < 30) {
      return (
        <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-black uppercase">
          Current
        </span>
      );
    } else if (agingDays < 60) {
      return (
        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase">
          30 Days
        </span>
      );
    } else if (agingDays < 90) {
      return (
        <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-black uppercase">
          60 Days
        </span>
      );
    } else if (agingDays < 120) {
      return (
        <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-xs font-black uppercase">
          90 Days
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-black uppercase">
          120+ Days
        </span>
      );
    }
  };

  const columns: Column<ARInvoice>[] = [
    {
      key: 'invoiceNumber',
      label: 'Invoice #',
      sortable: true,
      render: (item) => (
        <span className="font-black text-[#D70018] font-mono">{item.invoiceNumber}</span>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer',
      sortable: true,
      render: (item) => <span className="font-medium text-gray-900">{item.customerName}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (item) => (
        <span className="font-bold text-gray-900">${item.amount.toLocaleString()}</span>
      ),
    },
    {
      key: 'outstanding',
      label: 'Outstanding',
      sortable: true,
      render: (item) => (
        <span className="font-bold text-red-600">${item.outstanding.toLocaleString()}</span>
      ),
    },
    {
      key: 'agingDays',
      label: 'Aging',
      sortable: true,
      render: (item) => getAgingBadge(item.agingDays),
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      sortable: true,
      render: (item) => (
        <span className="text-sm text-gray-600">
          {new Date(item.dueDate).toLocaleDateString('en-US')}
        </span>
      ),
    },
  ];

  const agingBuckets: { key: AgingBucket; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: data.length },
    { key: 'current', label: 'Current', count: data.filter((d) => d.agingDays < 30).length },
    { key: '30', label: '30 Days', count: data.filter((d) => d.agingDays >= 30 && d.agingDays < 60).length },
    { key: '60', label: '60 Days', count: data.filter((d) => d.agingDays >= 60 && d.agingDays < 90).length },
    { key: '90', label: '90 Days', count: data.filter((d) => d.agingDays >= 90 && d.agingDays < 120).length },
    { key: '120+', label: '120+ Days', count: data.filter((d) => d.agingDays >= 120).length },
  ];

  const totalOutstanding = data.reduce((sum, item) => sum + item.outstanding, 0);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
            Accounts <span className="text-[#D70018]">Receivable</span>
          </h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">
            Manage customer invoices and payments
          </p>
        </div>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 text-[#D70018] rounded-2xl">
              <DollarSign size={24} />
            </div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Total Outstanding
            </span>
          </div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
            ${totalOutstanding.toLocaleString()}
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-2">Across {data.length} invoices</p>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock size={24} />
            </div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Overdue
            </span>
          </div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
            {data.filter((d) => d.status === 'overdue').length}
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-2">Invoices past due</p>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
              <AlertCircle size={24} />
            </div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Current
            </span>
          </div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
            {data.filter((d) => d.status === 'current').length}
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-2">On time invoices</p>
        </motion.div>
      </div>

      {/* Aging Buckets Filter */}
      <div className="premium-card p-6">
        <h3 className="text-sm font-black text-gray-700 uppercase mb-4">Filter by Aging</h3>
        <div className="flex flex-wrap gap-3">
          {agingBuckets.map((bucket) => (
            <button
              key={bucket.key}
              onClick={() => setSelectedAgingBucket(bucket.key)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                selectedAgingBucket === bucket.key
                  ? 'bg-[#D70018] text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {bucket.label} ({bucket.count})
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="premium-card p-6">
        <input
          type="text"
          placeholder="Search by invoice number or customer..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-card overflow-hidden"
      >
        <div className="p-8 border-b border-gray-50 bg-white/50 backdrop-blur-sm">
          <h3 className="text-xl font-black text-gray-900 uppercase italic">AR Invoices</h3>
        </div>
        <div className="p-6">
          <DataTable
            columns={columns}
            data={filteredData}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            isLoading={isLoading}
            actions={(item) => (
              <button
                onClick={() => openPaymentModal(item)}
                disabled={item.outstanding <= 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Payment
              </button>
            )}
          />
        </div>
      </motion.div>

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
