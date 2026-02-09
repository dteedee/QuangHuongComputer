import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { accountingApi, type APInvoice, type InvoiceStatus } from '../../../api/accounting';
import { DataTable, type Column } from '../../../components/crud/DataTable';
import { useCrudList, type QueryParams } from '../../../hooks/useCrudList';
import { formatCurrency } from '../../../utils/format';

type StatusFilter = 'all' | InvoiceStatus | 'paid_partially';

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

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'Draft':
        return (
          <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-black uppercase">
            Bản nháp
          </span>
        );
      case 'Issued':
        return (
          <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-black uppercase">
            Chờ xử lý
          </span>
        );
      case 'Paid':
        return (
          <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-black uppercase">
            Đã thanh toán
          </span>
        );
      case 'Overdue':
        return (
          <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-black uppercase">
            Quá hạn
          </span>
        );
      case 'Cancelled':
        return (
          <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-xs font-black uppercase">
            Đã hủy
          </span>
        );
      default:
        return null;
    }
  };

  const columns: Column<APInvoice>[] = [
    {
      key: 'invoiceNumber',
      label: 'Mã hóa đơn',
      sortable: true,
      render: (item) => (
        <span className="font-black text-[#D70018] font-mono">{item.invoiceNumber}</span>
      ),
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
      render: (item) => (
        <span className="font-bold text-gray-900">{formatCurrency(item.totalAmount)}</span>
      ),
    },
    {
      key: 'outstandingAmount',
      label: 'Còn nợ',
      sortable: true,
      render: (item) => (
        <span className="font-bold text-red-600">{formatCurrency(item.outstandingAmount)}</span>
      ),
    },
    {
      key: 'dueDate',
      label: 'Hạn thanh toán',
      sortable: true,
      render: (item) => (
        <span className="text-sm text-gray-600">
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <DollarSign size={24} />
            </div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Tổng số tiền nợ
            </span>
          </div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
            {formatCurrency(outstandingAmount)}
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-2">Trên tổng {formatCurrency(totalAmount)} hóa đơn</p>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock size={24} />
            </div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Đang chờ xử lý
            </span>
          </div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
            {data.filter((d) => d.status === 'Issued').length}
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-2">
            Hóa đơn chờ thanh toán
          </p>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="premium-card p-8 border-red-100 bg-red-50/10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
              <CheckCircle size={24} />
            </div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Quá hạn thanh toán
            </span>
          </div>
          <h3 className="text-3xl font-black text-red-600 tracking-tighter">
            {formatCurrency(overdueAmount)}
          </h3>
          <p className="text-xs text-red-400 font-bold mt-2">
            Cần ưu tiên xử lý
          </p>
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
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-[#D70018] rounded-2xl text-sm font-black uppercase tracking-tighter italic placeholder-gray-300 transition-all"
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
                {item.status === 'Issued' && (
                  <button className="px-6 py-2.5 bg-gray-950 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#D70018] transition-all active:scale-95 shadow-lg shadow-gray-200">
                    Thanh toán
                  </button>
                )}
                {item.status === 'Paid' && (
                  <span className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-gray-200">
                    Hoàn tất
                  </span>
                )}
                {item.status === 'Overdue' && (
                  <button className="px-6 py-2.5 bg-[#D70018] text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#b50014] transition-all active:scale-95 shadow-lg shadow-red-500/20">
                    Xử lý nợ
                  </button>
                )}
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
};

const SearchIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.3-4.3"></path>
  </svg>
);
