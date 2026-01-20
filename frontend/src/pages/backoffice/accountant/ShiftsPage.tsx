import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock, DollarSign, AlertCircle, X, CheckCircle, XCircle } from 'lucide-react';
import { accountingApi, Shift, OpenShiftDto } from '../../../api/accounting';
import { DataTable, Column } from '../../../components/crud/DataTable';
import { useCrudList } from '../../../hooks/useCrudList';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const openShiftSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  startingCash: z.number().min(0, 'Starting cash must be 0 or greater'),
});

const closeShiftSchema = z.object({
  actualCash: z.number().min(0, 'Actual cash must be 0 or greater'),
});

type OpenShiftFormData = z.infer<typeof openShiftSchema>;
type CloseShiftFormData = z.infer<typeof closeShiftSchema>;

interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OpenShiftDto) => Promise<void>;
  isSubmitting: boolean;
}

function OpenShiftModal({ isOpen, onClose, onSubmit, isSubmitting }: OpenShiftModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OpenShiftFormData>({
    resolver: zodResolver(openShiftSchema),
    defaultValues: {
      employeeId: '',
      startingCash: 0,
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
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-bold text-gray-900 uppercase">Open New Shift</h3>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee ID
                </label>
                <input
                  type="text"
                  {...register('employeeId')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter employee ID"
                  disabled={isSubmitting}
                />
                {errors.employeeId && (
                  <p className="mt-1 text-sm text-red-600">{errors.employeeId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Starting Cash Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('startingCash', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
                {errors.startingCash && (
                  <p className="mt-1 text-sm text-red-600">{errors.startingCash.message}</p>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Before opening a shift:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Count the cash in the register</li>
                      <li>Verify the starting amount is correct</li>
                      <li>Ensure no other shift is currently open</li>
                    </ul>
                  </div>
                </div>
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
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Opening...' : 'Open Shift'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface CloseShiftModalProps {
  shift: Shift | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (actualCash: number) => Promise<void>;
  isSubmitting: boolean;
}

function CloseShiftModal({ shift, isOpen, onClose, onSubmit, isSubmitting }: CloseShiftModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<CloseShiftFormData>({
    resolver: zodResolver(closeShiftSchema),
    defaultValues: {
      actualCash: 0,
    },
  });

  const actualCash = watch('actualCash');
  const variance = shift ? actualCash - (shift.expectedCash || 0) : 0;

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
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-bold text-gray-900 uppercase">Close Shift</h3>
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
                  <span className="text-gray-600 font-medium">Employee:</span>
                  <span className="font-bold text-gray-900">{shift.employeeName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Started:</span>
                  <span className="font-bold text-gray-900">
                    {new Date(shift.startTime).toLocaleString('en-US')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Starting Cash:</span>
                  <span className="font-bold text-gray-900">
                    ${shift.startingCash.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-gray-600 font-medium">Expected Cash:</span>
                  <span className="font-bold text-blue-600 text-lg">
                    ${(shift.expectedCash || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actual Cash Count
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('actualCash', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
                {errors.actualCash && (
                  <p className="mt-1 text-sm text-red-600">{errors.actualCash.message}</p>
                )}
              </div>

              {actualCash > 0 && (
                <div className={`p-4 rounded-lg ${variance === 0 ? 'bg-green-50' : variance > 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-3">
                    {variance === 0 ? (
                      <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle size={20} className={variance > 0 ? 'text-blue-600' : 'text-red-600'} />
                    )}
                    <div>
                      <p className={`font-bold ${variance === 0 ? 'text-green-800' : variance > 0 ? 'text-blue-800' : 'text-red-800'}`}>
                        Variance: ${Math.abs(variance).toLocaleString()}
                      </p>
                      <p className={`text-xs ${variance === 0 ? 'text-green-700' : variance > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                        {variance === 0 ? 'Cash matches expected amount' : variance > 0 ? 'Cash overage detected' : 'Cash shortage detected'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Before closing:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Count all cash in the register carefully</li>
                      <li>Double-check the amount</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </div>
                </div>
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
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Closing...' : 'Close Shift'}
              </button>
            </div>
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
    refetch,
  } = useCrudList<Shift>({
    queryKey: ['shifts'],
    fetchFn: accountingApi.getShifts,
    initialPageSize: 20,
  });

  const { data: currentShift, refetch: refetchCurrentShift } = useQuery({
    queryKey: ['current-shift'],
    queryFn: accountingApi.getCurrentShift,
  });

  const openShiftMutation = useMutation({
    mutationFn: (data: OpenShiftDto) => accountingApi.openShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      setIsOpenShiftModalOpen(false);
    },
  });

  const closeShiftMutation = useMutation({
    mutationFn: ({ shiftId, actualCash }: { shiftId: string; actualCash: number }) =>
      accountingApi.closeShift(shiftId, actualCash),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      setIsCloseShiftModalOpen(false);
    },
  });

  const handleOpenShift = async (data: OpenShiftDto) => {
    await openShiftMutation.mutateAsync(data);
  };

  const handleCloseShift = async (actualCash: number) => {
    if (!currentShift) return;
    await closeShiftMutation.mutateAsync({
      shiftId: currentShift.id,
      actualCash,
    });
  };

  const columns: Column<Shift>[] = [
    {
      key: 'employeeName',
      label: 'Employee',
      sortable: true,
      render: (item) => <span className="font-medium text-gray-900">{item.employeeName}</span>,
    },
    {
      key: 'startTime',
      label: 'Start Time',
      sortable: true,
      render: (item) => (
        <span className="text-sm text-gray-600">
          {new Date(item.startTime).toLocaleString('en-US')}
        </span>
      ),
    },
    {
      key: 'endTime',
      label: 'End Time',
      sortable: true,
      render: (item) => (
        <span className="text-sm text-gray-600">
          {item.endTime ? new Date(item.endTime).toLocaleString('en-US') : 'In Progress'}
        </span>
      ),
    },
    {
      key: 'startingCash',
      label: 'Starting Cash',
      sortable: true,
      render: (item) => (
        <span className="font-bold text-gray-900">${item.startingCash.toLocaleString()}</span>
      ),
    },
    {
      key: 'endingCash',
      label: 'Ending Cash',
      sortable: true,
      render: (item) => (
        <span className="font-bold text-gray-900">
          {item.endingCash !== undefined ? `$${item.endingCash.toLocaleString()}` : '-'}
        </span>
      ),
    },
    {
      key: 'variance',
      label: 'Variance',
      sortable: true,
      render: (item) => {
        if (item.variance === undefined) return <span className="text-gray-400">-</span>;
        const isPositive = item.variance > 0;
        const isZero = item.variance === 0;
        return (
          <span
            className={`font-bold ${
              isZero ? 'text-green-600' : isPositive ? 'text-blue-600' : 'text-red-600'
            }`}
          >
            {isPositive && '+'}${item.variance.toLocaleString()}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item) =>
        item.status === 'open' ? (
          <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-black uppercase">
            Open
          </span>
        ) : (
          <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-black uppercase">
            Closed
          </span>
        ),
    },
  ];

  const totalShifts = data.length;
  const openShifts = data.filter((s) => s.status === 'open').length;

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
            Shift <span className="text-[#D70018]">Management</span>
          </h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">
            Track cash drawer shifts and variance
          </p>
        </div>
      </div>

      {/* Current Shift Card */}
      {currentShift && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-card p-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-600 text-white rounded-2xl">
                <Clock size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 uppercase">Current Shift</h3>
                <p className="text-sm text-gray-600 font-bold">
                  {currentShift.employeeName} - Started{' '}
                  {new Date(currentShift.startTime).toLocaleTimeString('en-US')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsCloseShiftModalOpen(true)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-black uppercase hover:bg-red-700 transition-all"
            >
              Close Shift
            </button>
          </div>
          <div className="grid grid-cols-3 gap-6 mt-6">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Starting Cash</p>
              <p className="text-2xl font-black text-gray-900">
                ${currentShift.startingCash.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Expected Cash</p>
              <p className="text-2xl font-black text-blue-600">
                ${(currentShift.expectedCash || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Duration</p>
              <p className="text-2xl font-black text-gray-900">
                {Math.floor(
                  (Date.now() - new Date(currentShift.startTime).getTime()) / 1000 / 60 / 60
                )}
                h
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Action Button */}
      {!currentShift && (
        <div className="premium-card p-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-900 uppercase mb-2">No Active Shift</h3>
              <p className="text-sm text-gray-500">Open a new shift to start tracking transactions</p>
            </div>
            <button
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-black uppercase hover:bg-blue-700 transition-all"
            >
              Open New Shift
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <Clock size={24} />
            </div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Total Shifts
            </span>
          </div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{totalShifts}</h3>
          <p className="text-xs text-gray-400 font-bold mt-2">All time</p>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="premium-card p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
              <DollarSign size={24} />
            </div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Active Shifts
            </span>
          </div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{openShifts}</h3>
          <p className="text-xs text-gray-400 font-bold mt-2">Currently open</p>
        </motion.div>
      </div>

      {/* Shift History Table */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-card overflow-hidden"
      >
        <div className="p-8 border-b border-gray-50 bg-white/50 backdrop-blur-sm">
          <h3 className="text-xl font-black text-gray-900 uppercase italic">Shift History</h3>
        </div>
        <div className="p-6">
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
      </motion.div>

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
