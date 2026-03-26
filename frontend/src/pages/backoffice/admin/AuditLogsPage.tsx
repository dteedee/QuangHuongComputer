import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Search, Filter, Download, Trash2, ChevronLeft, ChevronRight,
  Clock, User, Shield, Database, FileText, Eye, X, RefreshCw,
  BarChart3, TrendingUp, Calendar, HardDrive, AlertTriangle, CheckCircle2,
  ArrowUpDown, ChevronDown, Layers, Save
} from 'lucide-react';
import { auditApi, backupApi, type AuditLog, type AuditLogQueryParams } from '../../../api/audit';
import { formatDate } from '../../../utils/format';
import toast from 'react-hot-toast';

// ============================================
// Helper Components
// ============================================

const ActionBadge = ({ action }: { action: string }) => {
  const colorMap: Record<string, string> = {
    'Create': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Update': 'bg-blue-100 text-blue-700 border-blue-200',
    'Delete': 'bg-red-100 text-red-700 border-red-200',
    'Login': 'bg-purple-100 text-purple-700 border-purple-200',
    'Logout': 'bg-gray-100 text-gray-700 border-gray-200',
    'Payment': 'bg-amber-100 text-amber-700 border-amber-200',
    'Checkout': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Cleanup': 'bg-orange-100 text-orange-700 border-orange-200',
  };

  const actionLabels: Record<string, string> = {
    'Create': 'Tạo mới',
    'Update': 'Cập nhật',
    'Delete': 'Xóa',
    'Login': 'Đăng nhập',
    'Logout': 'Đăng xuất',
    'Payment': 'Thanh toán',
    'Checkout': 'Đặt hàng',
    'Cleanup': 'Dọn dẹp',
  };

  const color = colorMap[action] || 'bg-gray-100 text-gray-700 border-gray-200';
  const label = actionLabels[action] || action;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {label}
    </span>
  );
};

const ModuleBadge = ({ module }: { module?: string }) => {
  if (!module) return <span className="text-xs text-gray-400">—</span>;

  const colorMap: Record<string, string> = {
    'Catalog': 'bg-indigo-50 text-indigo-600',
    'Sales': 'bg-emerald-50 text-emerald-600',
    'Payments': 'bg-amber-50 text-amber-600',
    'Identity': 'bg-purple-50 text-purple-600',
    'Inventory': 'bg-cyan-50 text-cyan-600',
    'Repair': 'bg-orange-50 text-orange-600',
    'Warranty': 'bg-pink-50 text-pink-600',
    'Accounting': 'bg-teal-50 text-teal-600',
    'SystemConfig': 'bg-gray-50 text-gray-600',
    'Content': 'bg-sky-50 text-sky-600',
    'HR': 'bg-rose-50 text-rose-600',
    'CRM': 'bg-violet-50 text-violet-600',
    'Communication': 'bg-lime-50 text-lime-600',
    'System': 'bg-slate-50 text-slate-600',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorMap[module] || 'bg-gray-50 text-gray-600'}`}>
      {module}
    </span>
  );
};

// ============================================
// Stats Card
// ============================================
const StatsCard = ({ title, value, icon: Icon, color, subtitle }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) => {
  const colorMap: Record<string, { bg: string; icon: string; ring: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-500', ring: 'ring-blue-500/20' },
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-500', ring: 'ring-emerald-500/20' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-500', ring: 'ring-amber-500/20' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500', ring: 'ring-purple-500/20' },
    red: { bg: 'bg-red-50', icon: 'text-red-500', ring: 'ring-red-500/20' },
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-500', ring: 'ring-indigo-500/20' },
  };

  const colors = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colors.bg} ring-1 ${colors.ring}`}>
          <Icon size={20} className={colors.icon} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString('vi-VN') : value}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// Detail Modal
// ============================================
const DetailModal = ({ log, onClose }: { log: AuditLog; onClose: () => void }) => {
  const parseJsonSafe = (json?: string) => {
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
  };

  const oldVals = parseJsonSafe(log.oldValues);
  const newVals = parseJsonSafe(log.newValues);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <FileText size={20} className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Chi tiết Audit Log</h2>
              <p className="text-xs text-gray-400">{log.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Hành động</p>
              <ActionBadge action={log.action} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Module</p>
              <ModuleBadge module={log.module} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Người thực hiện</p>
              <p className="text-sm font-medium text-gray-900">{log.userName || log.userId}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Thời gian</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(log.timestamp)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Đối tượng</p>
              <p className="text-sm font-medium text-gray-900">{log.entityName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">ID đối tượng</p>
              <p className="text-sm font-mono text-gray-700 break-all">{log.entityId}</p>
            </div>
          </div>

          {/* Details */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Chi tiết</p>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">{log.details}</div>
          </div>

          {/* Old/New Values Diff */}
          {(oldVals || newVals) && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Thay đổi dữ liệu</p>
              <div className="grid grid-cols-2 gap-3">
                {oldVals && (
                  <div>
                    <p className="text-xs font-medium text-red-500 mb-1.5 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400" /> Giá trị cũ
                    </p>
                    <pre className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-800 overflow-x-auto max-h-48">
                      {JSON.stringify(oldVals, null, 2)}
                    </pre>
                  </div>
                )}
                {newVals && (
                  <div>
                    <p className="text-xs font-medium text-emerald-500 mb-1.5 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Giá trị mới
                    </p>
                    <pre className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 overflow-x-auto max-h-48">
                      {JSON.stringify(newVals, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Technical Info */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Thông tin kỹ thuật</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">IP</span>
                <span className="font-mono text-gray-700">{log.ipAddress || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Request</span>
                <span className="font-mono text-gray-700">{log.requestMethod} {log.requestPath}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-500 shrink-0">User Agent</span>
                <span className="font-mono text-gray-700 text-right text-xs ml-4 break-all">{log.userAgent?.substring(0, 100) || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// Backup Section
// ============================================
const BackupSection = () => {
  const queryClient = useQueryClient();

  const { data: backups, isLoading } = useQuery({
    queryKey: ['backups', 'list'],
    queryFn: backupApi.list
  });

  const { data: backupStats } = useQuery({
    queryKey: ['backups', 'stats'],
    queryFn: backupApi.getStats
  });

  const createMutation = useMutation({
    mutationFn: backupApi.create,
    onSuccess: () => {
      toast.success('Đã tạo backup thành công!');
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: () => toast.error('Tạo backup thất bại!')
  });

  const deleteMutation = useMutation({
    mutationFn: backupApi.delete,
    onSuccess: () => {
      toast.success('Đã xóa backup!');
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: () => toast.error('Xóa backup thất bại!')
  });

  const handleDownload = async (fileName: string) => {
    try {
      const blob = await backupApi.download(fileName);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Đang tải backup...');
    } catch {
      toast.error('Tải backup thất bại!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Backup Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Tổng backup"
          value={backupStats?.totalBackups || 0}
          icon={HardDrive}
          color="indigo"
        />
        <StatsCard
          title="Dung lượng"
          value={backupStats?.totalSize || '0 B'}
          icon={Database}
          color="purple"
        />
        <StatsCard
          title="Backup gần nhất"
          value={backupStats?.newestBackup ? formatDate(backupStats.newestBackup) : 'Chưa có'}
          icon={Clock}
          color="green"
        />
      </div>

      {/* Backup Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-50">
          <div>
            <h3 className="font-semibold text-gray-900">Danh sách Backup</h3>
            <p className="text-xs text-gray-400 mt-1">Backup tự động mỗi 2 ngày. Bạn cũng có thể tạo backup thủ công.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span className="text-sm font-medium">Tạo Backup</span>
          </motion.button>
        </div>

        <div className="divide-y divide-gray-50">
          {isLoading ? (
            <div className="p-12 text-center text-gray-400">
              <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
              Đang tải...
            </div>
          ) : !backups?.backups?.length ? (
            <div className="p-12 text-center">
              <HardDrive size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Chưa có backup nào</p>
              <p className="text-xs text-gray-400 mt-1">Nhấn "Tạo Backup" để tạo backup đầu tiên</p>
            </div>
          ) : (
            backups.backups.map((backup) => (
              <div key={backup.baseName} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <HardDrive size={18} className="text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{backup.fileName}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{backup.sizeDump}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-400">{formatDate(backup.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(backup.fileName)}
                    className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors"
                    title="Tải xuống"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Bạn chắc chắn muốn xóa backup này?')) {
                        deleteMutation.mutate(backup.baseName);
                      }
                    }}
                    className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                    title="Xóa"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Main Page Component
// ============================================
export const AuditLogsPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'logs' | 'backups'>('logs');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [queryParams, setQueryParams] = useState<AuditLogQueryParams>({
    page: 1,
    pageSize: 20,
    sortDescending: true,
  });
  const [searchInput, setSearchInput] = useState('');

  // Queries
  const { data: logsData, isLoading: logsLoading, refetch } = useQuery({
    queryKey: ['audit-logs', queryParams],
    queryFn: () => auditApi.getLogs(queryParams),
    enabled: activeTab === 'logs',
  });

  const { data: statsData } = useQuery({
    queryKey: ['audit-logs', 'stats'],
    queryFn: auditApi.getStats,
    enabled: activeTab === 'logs',
  });

  const { data: filtersData } = useQuery({
    queryKey: ['audit-logs', 'filters'],
    queryFn: auditApi.getFilters,
    enabled: activeTab === 'logs',
  });

  // Mutations
  const exportMutation = useMutation({
    mutationFn: () => auditApi.exportCsv(queryParams),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Đã xuất file CSV!');
    },
    onError: () => toast.error('Xuất CSV thất bại!')
  });

  const cleanupMutation = useMutation({
    mutationFn: () => auditApi.cleanup(90),
    onSuccess: (data) => {
      toast.success(`Đã xóa ${data.deletedCount} log cũ!`);
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: () => toast.error('Dọn dẹp thất bại!')
  });

  // Handlers
  const handleSearch = () => {
    setQueryParams(prev => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleFilterChange = (key: keyof AuditLogQueryParams, value: string) => {
    setQueryParams(prev => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setQueryParams(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setQueryParams({ page: 1, pageSize: 20, sortDescending: true });
    setSearchInput('');
  };

  const hasActiveFilters = queryParams.action || queryParams.entityName || queryParams.module
    || queryParams.dateFrom || queryParams.dateTo || queryParams.search;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">
            <span className="text-indigo-600">Nhật ký</span> Hệ thống
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Theo dõi toàn bộ hoạt động thay đổi dữ liệu và sao lưu hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={16} />
            <span className="text-sm font-medium">Làm mới</span>
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'logs' as const, label: 'Nhật ký hoạt động', icon: Activity },
          { key: 'backups' as const, label: 'Sao lưu dữ liệu', icon: HardDrive },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Backup Tab */}
      {activeTab === 'backups' && <BackupSection />}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          {statsData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Tổng log" value={statsData.totalLogs} icon={Layers} color="blue" />
              <StatsCard title="Hôm nay" value={statsData.todayLogs} icon={Calendar} color="green" />
              <StatsCard title="Tuần này" value={statsData.weekLogs} icon={TrendingUp} color="amber" />
              <StatsCard title="Tháng này" value={statsData.monthLogs} icon={BarChart3} color="purple" />
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, chi tiết, ID..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSearch}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Tìm
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors ${
                    showFilters || hasActiveFilters
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Filter size={14} />
                  Bộ lọc
                  {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Download size={14} />
                  Xuất CSV
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (confirm('Xóa các log cũ hơn 90 ngày?')) cleanupMutation.mutate();
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 border border-red-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                  Dọn dẹp
                </motion.button>
              </div>
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 mt-4 border-t border-gray-100">
                    <select
                      value={queryParams.action || ''}
                      onChange={(e) => handleFilterChange('action', e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Tất cả hành động</option>
                      {filtersData?.actions?.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>

                    <select
                      value={queryParams.entityName || ''}
                      onChange={(e) => handleFilterChange('entityName', e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Tất cả đối tượng</option>
                      {filtersData?.entityNames?.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>

                    <select
                      value={queryParams.module || ''}
                      onChange={(e) => handleFilterChange('module', e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Tất cả module</option>
                      {filtersData?.modules?.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>

                    <input
                      type="date"
                      value={queryParams.dateFrom || ''}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Từ ngày"
                    />

                    <input
                      type="date"
                      value={queryParams.dateTo || ''}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Đến ngày"
                    />
                  </div>

                  {hasActiveFilters && (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={clearFilters}
                        className="text-xs text-indigo-600 font-medium hover:text-indigo-700"
                      >
                        ✕ Xóa bộ lọc
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Thời gian</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Người dùng</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Hành động</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Module</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Đối tượng</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Chi tiết</th>
                    <th className="text-center text-xs font-semibold text-gray-500 px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                        <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                        Đang tải...
                      </td>
                    </tr>
                  ) : !logsData?.items?.length ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <Activity size={40} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Không có log nào</p>
                        <p className="text-xs text-gray-400 mt-1">Các thao tác thay đổi dữ liệu sẽ được ghi nhận ở đây</p>
                      </td>
                    </tr>
                  ) : (
                    logsData.items.map((log) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                        onClick={() => setSelectedLog(log)}
                      >
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-500">{formatDate(log.timestamp)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                              <User size={12} className="text-indigo-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                              {log.userName || log.userId?.substring(0, 8) + '...'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ActionBadge action={log.action} />
                        </td>
                        <td className="px-4 py-3">
                          <ModuleBadge module={log.module} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700">{log.entityName}</span>
                          <span className="text-xs text-gray-400 ml-1.5 font-mono">#{log.entityId?.substring(0, 8)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600 truncate max-w-[200px]">{log.details}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button className="p-1.5 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                            <Eye size={14} className="text-blue-500" />
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logsData && logsData.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Hiển thị {((logsData.page - 1) * logsData.pageSize) + 1}-{Math.min(logsData.page * logsData.pageSize, logsData.total)} / {logsData.total.toLocaleString('vi-VN')} kết quả
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(logsData.page - 1)}
                    disabled={!logsData.hasPreviousPage}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} className="text-gray-600" />
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, logsData.totalPages) }, (_, i) => {
                    const startPage = Math.max(1, Math.min(logsData.page - 2, logsData.totalPages - 4));
                    const pageNum = startPage + i;
                    if (pageNum > logsData.totalPages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                          pageNum === logsData.page
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(logsData.page + 1)}
                    disabled={!logsData.hasNextPage}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};
