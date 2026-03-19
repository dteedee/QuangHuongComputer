import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Edit, Trash2, Search, RefreshCw, Filter, Tag,
  Calendar, Percent, DollarSign, AlertCircle, Check, X, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import client from '@api/client';

// Types
interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'Percentage' | 'FixedAmount';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  validFrom: string;
  validTo: string;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

interface CouponFormData {
  code: string;
  description: string;
  discountType: 'Percentage' | 'FixedAmount';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  validFrom: string;
  validTo: string;
  usageLimit: number | null;
}

// API functions
const couponsApi = {
  getAll: async (status?: string): Promise<Coupon[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await client.get(`/content/admin/coupons${params}`);
    return response.data;
  },
  create: async (data: CouponFormData): Promise<Coupon> => {
    const response = await client.post('/content/admin/coupons', data);
    return response.data;
  },
  update: async (id: string, data: Partial<CouponFormData> & { isActive?: boolean }): Promise<Coupon> => {
    const response = await client.put(`/content/admin/coupons/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await client.delete(`/content/admin/coupons/${id}`);
  },
};

// Format helpers
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const formatDateForInput = (dateString: string) => {
  return new Date(dateString).toISOString().split('T')[0];
};

export function CouponsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form state
  const [formData, setFormData] = useState<CouponFormData>({
    code: '',
    description: '',
    discountType: 'Percentage',
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscount: null,
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usageLimit: null,
  });

  // Fetch coupons
  const { data: coupons, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'coupons', statusFilter],
    queryFn: () => couponsApi.getAll(statusFilter === 'all' ? undefined : statusFilter),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: couponsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      toast.success('Tạo mã giảm giá thành công!');
      closeModal();
    },
    onError: () => {
      toast.error('Không thể tạo mã giảm giá!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CouponFormData> & { isActive?: boolean } }) =>
      couponsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      toast.success('Cập nhật mã giảm giá thành công!');
      closeModal();
    },
    onError: () => {
      toast.error('Không thể cập nhật mã giảm giá!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: couponsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      toast.success('Xóa mã giảm giá thành công!');
    },
    onError: () => {
      toast.error('Không thể xóa mã giảm giá!');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (coupon: Coupon) => couponsApi.update(coupon.id, { isActive: !coupon.isActive }),
    onSuccess: (_, coupon) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      toast.success(coupon.isActive ? 'Đã vô hiệu hóa mã giảm giá!' : 'Đã kích hoạt mã giảm giá!');
    },
    onError: () => {
      toast.error('Thao tác thất bại!');
    },
  });

  // Handlers
  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      description: '',
      discountType: 'Percentage',
      discountValue: 10,
      minOrderAmount: 0,
      maxDiscount: null,
      validFrom: new Date().toISOString().split('T')[0],
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      usageLimit: null,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscount: coupon.maxDiscount,
      validFrom: formatDateForInput(coupon.validFrom),
      validTo: formatDateForInput(coupon.validTo),
      usageLimit: coupon.usageLimit,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCoupon(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (coupon: Coupon) => {
    if (window.confirm(`Bạn có chắc muốn xóa mã "${coupon.code}"?`)) {
      deleteMutation.mutate(coupon.id);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Đã sao chép mã!');
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'QH';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  // Filter coupons
  const filteredCoupons = coupons?.filter(coupon =>
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getCouponStatus = (coupon: Coupon) => {
    const now = new Date();
    const validTo = new Date(coupon.validTo);
    const validFrom = new Date(coupon.validFrom);

    if (!coupon.isActive) return { label: 'Vô hiệu', color: 'bg-gray-100 text-gray-700' };
    if (now > validTo) return { label: 'Hết hạn', color: 'bg-red-100 text-red-700' };
    if (now < validFrom) return { label: 'Chờ kích hoạt', color: 'bg-yellow-100 text-yellow-700' };
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
      return { label: 'Hết lượt', color: 'bg-orange-100 text-orange-700' };
    return { label: 'Hoạt động', color: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý mã giảm giá</h1>
          <p className="text-gray-500 text-sm mt-1">
            Tạo và quản lý các mã khuyến mãi cho khách hàng
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo mã mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Tag className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng mã</p>
              <p className="text-2xl font-bold text-gray-900">{coupons?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Đang hoạt động</p>
              <p className="text-2xl font-bold text-gray-900">
                {coupons?.filter(c => getCouponStatus(c).label === 'Hoạt động').length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Percent className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Giảm %</p>
              <p className="text-2xl font-bold text-gray-900">
                {coupons?.filter(c => c.discountType === 'Percentage').length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Giảm tiền</p>
              <p className="text-2xl font-bold text-gray-900">
                {coupons?.filter(c => c.discountType === 'FixedAmount').length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm mã giảm giá..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
            >
              <option value="all">Tất cả</option>
              <option value="active">Đang hoạt động</option>
              <option value="expired">Hết hạn</option>
            </select>
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-500 mt-3">Đang tải...</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-8 text-center">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Không có mã giảm giá nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Mã</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Giảm giá</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Điều kiện</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Thời hạn</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Sử dụng</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCoupons.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                            {coupon.code}
                          </code>
                          <button
                            onClick={() => handleCopyCode(coupon.code)}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Sao chép"
                          >
                            <Copy className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{coupon.description}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {coupon.discountType === 'Percentage' ? (
                            <>
                              <Percent className="w-4 h-4 text-amber-500" />
                              <span className="font-bold text-amber-600">{coupon.discountValue}%</span>
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-4 h-4 text-green-500" />
                              <span className="font-bold text-green-600">{formatPrice(coupon.discountValue)}</span>
                            </>
                          )}
                        </div>
                        {coupon.maxDiscount && (
                          <p className="text-xs text-gray-400 mt-1">Tối đa: {formatPrice(coupon.maxDiscount)}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">
                          Đơn tối thiểu: {formatPrice(coupon.minOrderAmount)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {formatDate(coupon.validFrom)} - {formatDate(coupon.validTo)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {coupon.usedCount}
                          {coupon.usageLimit ? `/${coupon.usageLimit}` : ''} lượt
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleStatusMutation.mutate(coupon)}
                            className={`p-2 rounded-lg transition-colors ${
                              coupon.isActive
                                ? 'hover:bg-red-100 text-red-500'
                                : 'hover:bg-green-100 text-green-500'
                            }`}
                            title={coupon.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                          >
                            {coupon.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => openEditModal(coupon)}
                            className="p-2 hover:bg-blue-100 text-blue-500 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(coupon)}
                            className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-[#D70018] to-[#ff4d4d] px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {editingCoupon ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-white/20 rounded-full">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã giảm giá <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="VD: QHSALE20"
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 uppercase"
                    required
                    disabled={!!editingCoupon}
                  />
                  {!editingCoupon && (
                    <button
                      type="button"
                      onClick={generateCode}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      Tạo mã
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="VD: Giảm 20% cho đơn hàng đầu tiên"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại giảm giá</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                  >
                    <option value="Percentage">Phần trăm (%)</option>
                    <option value="FixedAmount">Số tiền cố định</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá trị {formData.discountType === 'Percentage' ? '(%)' : '(VNĐ)'}
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    min={0}
                    max={formData.discountType === 'Percentage' ? 100 : undefined}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    required
                  />
                </div>
              </div>

              {/* Min Order & Max Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn tối thiểu (VNĐ)</label>
                  <input
                    type="number"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: Number(e.target.value) })}
                    min={0}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giảm tối đa (VNĐ)</label>
                  <input
                    type="number"
                    value={formData.maxDiscount || ''}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value ? Number(e.target.value) : null })}
                    min={0}
                    placeholder="Không giới hạn"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
              </div>

              {/* Valid From & To */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={formData.validTo}
                    onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    required
                  />
                </div>
              </div>

              {/* Usage Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giới hạn sử dụng</label>
                <input
                  type="number"
                  value={formData.usageLimit || ''}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value ? Number(e.target.value) : null })}
                  min={1}
                  placeholder="Không giới hạn"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Đang xử lý...' : editingCoupon ? 'Cập nhật' : 'Tạo mã'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CouponsPage;
