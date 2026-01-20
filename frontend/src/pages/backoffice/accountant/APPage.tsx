import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { accountingApi, APInvoice } from '../../../api/accounting';
import { DataTable, Column } from '../../../components/crud/DataTable';
import { useCrudList } from '../../../hooks/useCrudList';

type StatusFilter = 'all' | 'pending' | 'approved' | 'paid';

export const APPage = () => {
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');

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
    fetchFn: accountingApi.getAPList,
    initialPageSize: 20,
  });

  const filteredData = useMemo(() => {
    if (selectedStatus === 'all') return data;
    return data.filter((invoice) => invoice.status === selectedStatus);
  }, [data, selectedStatus]);

  const getStatusBadge = (status: APInvoice['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-black uppercase">
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase">
            Approved
          </span>
        );
      case 'paid':
        return (
          <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-black uppercase">
            Paid
          </span>
        );
      default:
        return null;
    }
  };

  const columns: Column<APInvoice>[] = [
    {
      key: 'invoiceNumber',
      label: 'Invoice #',
      sortable: true,
      render: (item) => (
        <span className="font-black text-[#D70018] font-mono">{item.invoiceNumber}</span>
      ),
    },
    {
      key: 'supplierName',
      label: 'Supplier',
      sortable: true,
      render: (item) => <span className="font-medium text-gray-900">{item.supplierName}</span>,
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
      key: 'poReference',
      label: 'PO Reference',
      render: (item) => (
        <span className="text-sm text-gray-600 font-mono">
          {item.poReference || 'N/A'}
        </span>
      ),
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
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item) => getStatusBadge(item.status),
    },
  ];

  const statusFilters: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: data.length },
    { key: 'pending', label: 'Pending', count: data.filter((d) => d.status === 'pending').length },
    { key: 'approved', label: 'Approved', count: data.filter((d) => d.status === 'approved').length },
    { key: 'paid', label: 'Paid', count: data.filter((d) => d.status === 'paid').length },
  ];

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
  const pendingAmount = data
    .filter((d) => d.status === 'pending')
    .reduce((sum, item) => sum + item.amount, 0);
  const approvedAmount = data
    .filter((d) => d.status === 'approved')
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
            Accounts <span className="text-[#D70018]">Payable</span>
          </h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">
            Manage supplier invoices and payments
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <DollarSign size={24} />
            </div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Total Payable
            </span>
          </div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
            ${totalAmount.toLocaleString()}
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-2">Across {data.length} invoices</p>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock size={24} />
            </div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Pending
            </span>
          </div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
            ${pendingAmount.toLocaleString()}
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-2">
            {data.filter((d) => d.status === 'pending').length} invoices
          </p>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
              <CheckCircle size={24} />
            </div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Approved
            </span>
          </div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
            ${approvedAmount.toLocaleString()}
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-2">
            {data.filter((d) => d.status === 'approved').length} invoices
          </p>
        </motion.div>
      </div>

      {/* Status Filter */}
      <div className="premium-card p-6">
        <h3 className="text-sm font-black text-gray-700 uppercase mb-4">Filter by Status</h3>
        <div className="flex flex-wrap gap-3">
          {statusFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedStatus(filter.key)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                selectedStatus === filter.key
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
      <div className="premium-card p-6">
        <input
          type="text"
          placeholder="Search by invoice number, supplier, or PO reference..."
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
          <h3 className="text-xl font-black text-gray-900 uppercase italic">AP Invoices</h3>
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
              <div className="flex gap-2 justify-end">
                {item.status === 'pending' && (
                  <button className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-blue-700">
                    Approve
                  </button>
                )}
                {item.status === 'approved' && (
                  <button className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-green-700">
                    Mark Paid
                  </button>
                )}
                {item.status === 'paid' && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-400 rounded-lg text-xs font-bold uppercase">
                    Completed
                  </span>
                )}
              </div>
            )}
          />
        </div>
      </motion.div>
    </div>
  );
};
