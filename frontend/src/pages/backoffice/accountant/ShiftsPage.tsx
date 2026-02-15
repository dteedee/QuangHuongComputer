import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock, DollarSign, AlertCircle, X, CheckCircle, ArrowRight } from 'lucide-react';
import { accountingApi, type ShiftSession, type ShiftStatus, type OpenShiftRequest } from '../../../api/accounting';
import { DataTable, type Column } from '../../../components/crud/DataTable';
import { useCrudList, type QueryParams } from '../../../hooks/useCrudList';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatCurrency } from '../../../utils/format';

const openShiftSchema = z.object({
  cashierId: z.string().min(1, 'Mã thu ngân là bắt buộc'),
  warehouseId: z.string().min(1, 'Mã kho là bắt buộc'),
  openingBalance: z.number().min(0, 'Số dư đầu ca phải từ 0 trở lên'),
});

const closeShiftSchema = z.object({
  actualCash: z.number().min(0, 'Số tiền thực tế phải từ 0 trở lên'),
});

type OpenShiftFormData = z.infer<typeof openShiftSchema>;
type CloseShiftFormData = z.infer<typeof closeShiftSchema>;

interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OpenShiftRequest) => Promise<void>;
  isSubmitting: boolean;
}

function OpenShiftModal({ isOpen, onClose, onSubmit, isSubmitting }: OpenShiftModalProps) {
  const {
    register,
    handleSubmit,
    reset,
  } = useForm<OpenShiftFormData>({
    resolver: zodResolver(openShiftSchema),
    defaultValues: {
      cashierId: '',
      warehouseId: 'MAIN',
      openingBalance: 0,
    },
  });

  const handleFormSubmit = async (data: OpenShiftFormData) => {
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
        <div
          className="fixed inset-0 transition-opacity bg-gray-950/40 backdrop-blur-sm"
          onClick={handleClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-100">
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50 bg-gray-50/50">
            <h3 className="text-xl font-black text-gray-950 uppercase italic tracking-tighter">Mở ca làm việc</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-950 transition-colors"
              disabled={isSubmitting}
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="px-8 py-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic ml-1">Mã thu ngân</label>
                  <input
                    type="text"
                    {...register('cashierId')}
                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-0 focus:border-[#D70018] font-black text-xs uppercase tracking-widest placeholder-gray-400 text-gray-900 transition-all"
                    placeholder="ENTER ID"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic ml-1">Mã kho</label>
                  <input
                    type="text"
                    {...register('warehouseId')}
                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-0 focus:border-[#D70018] font-black text-xs uppercase tracking-widest placeholder-gray-400 text-gray-900 transition-all font-mono"
                    placeholder="MAIN"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic ml-1">Số dư tiền mặt đầu ca</label>
                <div className="relative">
                  <input
                    type="number"
                    {...register('openingBalance', { valueAsNumber: true })}
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:ring-0 focus:border-[#D70018] font-black text-2xl tracking-tighter italic text-[#D70018] transition-all"
                    placeholder="0"
                    disabled={isSubmitting}
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-black italic">VND</div>
                </div>
              </div>

              <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <CheckCircle size={16} />
                  </div>
                  <span className="text-xs font-black text-blue-900 uppercase tracking-widest italic">Quy định mở ca</span>
                </div>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-[10px] text-blue-700 font-bold uppercase tracking-wider">
                    <ArrowRight size={10} /> Kiểm đếm tiền mặt thực tế trong ngăn kéo
                  </li>
                  <li className="flex items-center gap-2 text-[10px] text-blue-700 font-bold uppercase tracking-wider">
                    <ArrowRight size={10} /> Đảm bảo bàn giao đầy đủ từ ca trước
                  </li>
                </ul>
              </div>
            </div>

            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-950 transition-all"
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-10 py-4 bg-gray-950 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-2xl shadow-gray-950/20 hover:bg-[#D70018] transform hover:scale-105 transition-all active:scale-95 flex items-center gap-3"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'ĐANG MỞ CHỨNG TỪ...' : (
                  <>
                    XÁC NHẬN MỞ CA <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface CloseShiftModalProps {
  shift: ShiftSession | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (actualCash: number) => Promise<void>;
  isSubmitting: boolean;
}

function CloseShiftModal({ shift, isOpen, onClose, onSubmit, isSubmitting }: CloseShiftModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
  } = useForm<CloseShiftFormData>({
    resolver: zodResolver(closeShiftSchema),
    defaultValues: {
      actualCash: 0,
    },
  });

  const actualCash = watch('actualCash');
  const variance = shift ? actualCash - (shift.openingBalance + (shift.closingBalance || 0)) : 0; // Simplified logic for UI

  const handleFormSubmit = async (data: CloseShiftFormData) => {
    await onSubmit(data.actualCash);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen || !shift) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-950/60 backdrop-blur-md"
          onClick={handleClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-[40px] text-left overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.3)] transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border-4 border-gray-50">
          <div className="px-10 py-10 bg-gray-950">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">Đóng ca</h3>
                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Xác nhận kết thúc phiên làm việc</p>
              </div>
              <button onClick={handleClose} className="text-gray-600 hover:text-white transition-colors">
                <X size={32} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-5 bg-white/5 rounded-3xl border border-white/10">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Thu ngân</span>
                <span className="text-sm font-black text-white italic">{shift.cashierId}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white/5 rounded-3xl border border-white/10">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Đầu ca</span>
                  <span className="text-lg font-black text-white tracking-tighter">{formatCurrency(shift.openingBalance)}</span>
                </div>
                <div className="p-5 bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-2">Dự kiến</span>
                  <span className="text-lg font-black text-emerald-400 tracking-tighter">{formatCurrency(shift.openingBalance + (shift.closingBalance || 0))}</span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="p-10 space-y-8">
            <div className="space-y-4">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest italic ml-1">Tiền mặt thực tế tại quầy</label>
              <div className="relative">
                <input
                  type="number"
                  {...register('actualCash', { valueAsNumber: true })}
                  className="w-full px-8 py-10 bg-gray-50 border-4 border-gray-100 rounded-[32px] focus:ring-0 focus:border-[#D70018] font-black text-5xl tracking-tighter italic text-[#D70018] transition-all text-center"
                  placeholder="0"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {actualCash > 0 && (
              <div className={`p-8 rounded-[32px] border-4 ${variance === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl ${variance === 0 ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-red-500 text-white shadow-red-500/20'}`}>
                    <CheckCircle size={28} />
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${variance === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      Trạng thái đối soát
                    </p>
                    <p className={`text-2xl font-black italic tracking-tighter ${variance === 0 ? 'text-emerald-950' : 'text-red-950'}`}>
                      {variance === 0 ? 'KHỚP SỐ DƯ 100%' : `LỆCH: ${formatCurrency(Math.abs(variance))}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-6 bg-gray-950 text-white text-sm font-black uppercase tracking-[0.2em] rounded-[32px] shadow-2xl shadow-gray-950/40 hover:bg-[#D70018] transform hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'ĐANG CHỐT SỔ...' : 'KẾT THÚC & ĐÓNG CA'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export const ShiftsPage = () => {
  const queryClient = useQueryClient();
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);

  const {
    data,
    total,
    page,
    pageSize,
    isLoading,
    handlePageChange,
  } = useCrudList<ShiftSession>({
    queryKey: ['shifts'],
    fetchFn: async (params: QueryParams) => {
      const result = await accountingApi.shifts.getList({ page: params.page, pageSize: params.pageSize });
      return {
        ...result,
        totalPages: Math.ceil(result.total / result.pageSize),
        hasPreviousPage: result.page > 1,
        hasNextPage: result.page < Math.ceil(result.total / result.pageSize),
      };
    },
    initialPageSize: 20,
  });

  // Simplified: assume first open shift is current
  const currentShift = data.find(s => s.status === 'Open');

  const openShiftMutation = useMutation({
    mutationFn: (data: OpenShiftRequest) => accountingApi.shifts.open(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setIsOpenShiftModalOpen(false);
    },
  });

  const closeShiftMutation = useMutation({
    mutationFn: ({ shiftId, actualCash }: { shiftId: string; actualCash: number }) =>
      accountingApi.shifts.close(shiftId, { actualCash }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setIsCloseShiftModalOpen(false);
    },
  });

  const handleOpenShift = async (data: OpenShiftRequest) => {
    await openShiftMutation.mutateAsync(data);
  };

  const handleCloseShift = async (actualCash: number) => {
    if (!currentShift) return;
    await closeShiftMutation.mutateAsync({
      shiftId: currentShift.id,
      actualCash,
    });
  };

  const getStatusBadge = (status: ShiftStatus) => {
    return status === 'Open' ? (
      <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-200">
        Đang mở
      </span>
    ) : (
      <span className="px-4 py-1.5 bg-gray-100 text-gray-500 rounded-xl text-[9px] font-black uppercase tracking-widest border border-gray-200">
        Đã đóng
      </span>
    );
  };

  const columns: Column<ShiftSession>[] = [
    {
      key: 'cashierId',
      label: 'Thu ngân',
      sortable: true,
      render: (item) => <span className="font-black text-gray-950 uppercase italic text-xs tracking-tight">{item.cashierId}</span>,
    },
    {
      key: 'openedAt',
      label: 'Bắt đầu',
      sortable: true,
      render: (item) => (
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          {new Date(item.openedAt).toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      key: 'closedAt',
      label: 'Kết thúc',
      sortable: true,
      render: (item) => (
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          {item.closedAt ? new Date(item.closedAt).toLocaleString('vi-VN') : (
            <span className="text-[#D70018] animate-pulse">ĐANG HOẠT ĐỘNG</span>
          )}
        </span>
      ),
    },
    {
      key: 'openingBalance',
      label: 'Tiền đầu ca',
      sortable: true,
      render: (item) => (
        <span className="font-black text-gray-950 tracking-tighter italic">{formatCurrency(item.openingBalance)}</span>
      ),
    },
    {
      key: 'closingBalance',
      label: 'Tiền kết ca',
      sortable: true,
      render: (item) => (
        <span className="font-black text-gray-950 tracking-tighter italic">
          {item.closingBalance !== undefined ? formatCurrency(item.closingBalance) : '---'}
        </span>
      ),
    },
    {
      key: 'cashVariance',
      label: 'Chênh lệch',
      sortable: true,
      render: (item) => {
        if (item.cashVariance === undefined) return <span className="text-gray-300 font-black tracking-widest">---</span>;
        const isPositive = item.cashVariance > 0;
        const isZero = item.cashVariance === 0;
        return (
          <span
            className={`font-black italic tracking-tighter ${isZero ? 'text-gray-400' : isPositive ? 'text-blue-600' : 'text-[#D70018]'
              }`}
          >
            {isPositive && '+'}{formatCurrency(item.cashVariance)}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Trạng thái',
      sortable: true,
      render: (item) => getStatusBadge(item.status),
    },
  ];

  return (
    <div className="space-y-12 pb-20 admin-area">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-4">
            Quản lý <span className="text-[#D70018]">Ca làm việc</span>
          </h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#D70018] animate-ping" /> Kiểm soát dòng tiền mặt & đối soát ca trực
          </p>
        </div>
      </div>

      {/* Current Shift Card */}
      {currentShift && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="premium-card p-12 bg-gray-950 text-white border-none overflow-hidden group shadow-[0_30px_70px_rgba(0,0,0,0.2)]"
        >
          <div className="absolute top-0 right-0 p-12 text-white/5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
            <Clock size={240} />
          </div>

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-12">
            <div className="flex items-center gap-10">
              <div className="w-24 h-24 bg-[#D70018] text-white rounded-[32px] flex items-center justify-center shadow-2xl shadow-red-500/30 transform group-hover:rotate-12 transition-transform duration-500">
                <Clock size={40} />
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Phiên trực hiện tại</h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">NHÂN VIÊN:</span>
                    <span className="text-sm font-black italic text-red-500">{currentShift.cashierId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">BẮT ĐẦU:</span>
                    <span className="text-sm font-black italic">{new Date(currentShift.openedAt).toLocaleTimeString('vi-VN')}</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsCloseShiftModalOpen(true)}
              className="px-12 py-5 bg-white text-gray-950 rounded-[20px] font-black uppercase tracking-[0.2em] text-xs hover:bg-[#D70018] hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-2xl"
            >
              KẾT THÚC PHIÊN TRỰC
            </button>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 mt-16 pt-12 border-t border-white/10">
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mb-4 italic">Tiền mặt đầu ca</p>
              <p className="text-4xl font-black text-white tracking-tighter italic">
                {formatCurrency(currentShift.openingBalance)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mb-4 italic">Doanh thu dự kiến</p>
              <p className="text-4xl font-black text-red-500 tracking-tighter italic">
                {formatCurrency(currentShift.closingBalance || 0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mb-4 italic">Thời gian trực</p>
              <p className="text-4xl font-black text-white tracking-tighter italic font-mono uppercase">
                {Math.floor((Date.now() - new Date(currentShift.openedAt).getTime()) / 1000 / 60)} PHÚT
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Button */}
      {!currentShift && (
        <div className="premium-card p-12 border-2 border-dashed border-gray-200 bg-gray-50/50 group hover:border-[#D70018] transition-colors">
          <div className="flex flex-col items-center text-center gap-8">
            <div className="w-20 h-20 rounded-[28px] bg-white shadow-xl flex items-center justify-center text-gray-300 group-hover:text-[#D70018] group-hover:scale-110 transition-all duration-500">
              <AlertCircle size={40} />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-gray-950 uppercase italic tracking-tighter leading-none">Hệ thống đang chờ lệnh mở ca</h3>
              <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Bắt đầu phiên trực mới để ghi nhận các giao dịch tiền mặt</p>
            </div>
            <button
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="px-14 py-5 bg-gray-950 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-[#D70018] transition-all transform hover:scale-105 active:scale-95 shadow-2xl flex items-center gap-4"
            >
              MỞ CA LÀM VIỆC MỚI <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Status Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <motion.div whileHover={{ y: -5 }} className="premium-card p-10 group border-2 border-gray-50">
          <div className="flex items-center justify-between mb-6">
            <div className="w-14 h-14 bg-gray-50 text-gray-950 rounded-2xl flex items-center justify-center group-hover:bg-gray-950 group-hover:text-white transition-all duration-500 shadow-sm border border-gray-100">
              <Clock size={28} />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic">Tổng số phiên</span>
          </div>
          <h3 className="text-5xl font-black text-gray-950 tracking-tighter italic">{total}</h3>
          <div className="mt-8 pt-6 border-t border-gray-50 flex items-center gap-2">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Lịch sử hoạt động toàn thời gian</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="premium-card p-10 group border-2 border-emerald-50 bg-emerald-50/10">
          <div className="flex items-center justify-between mb-6">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 shadow-sm border border-emerald-100">
              <DollarSign size={28} />
            </div>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] italic">Phiên đang mở</span>
          </div>
          <h3 className="text-5xl font-black text-emerald-950 tracking-tighter italic">{data.filter(s => s.status === 'Open').length}</h3>
          <div className="mt-8 pt-6 border-t border-emerald-100 flex items-center gap-2">
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest italic animate-pulse">Hệ thống đang ghi nhận</span>
          </div>
        </motion.div>
      </div>

      {/* History */}
      <div className="premium-card p-4 border-2 shadow-[0_40px_80px_rgba(0,0,0,0.05)] bg-white">
        <div className="p-8 border-b border-gray-50">
          <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Lịch sử ca làm việc</h3>
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
          />
        </div>
      </div>

      {/* Modals */}
      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        onSubmit={handleOpenShift}
        isSubmitting={openShiftMutation.isPending}
      />

      <CloseShiftModal
        shift={currentShift || null}
        isOpen={isCloseShiftModalOpen}
        onClose={() => setIsCloseShiftModalOpen(false)}
        onSubmit={handleCloseShift}
        isSubmitting={closeShiftMutation.isPending}
      />
    </div>
  );
};
