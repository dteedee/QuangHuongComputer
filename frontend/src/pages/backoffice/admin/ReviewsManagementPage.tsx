import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star, Check, X, Search, RefreshCw, Filter, ChevronLeft, ChevronRight,
  MessageSquare, Eye, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import client from '@api/client';

interface PendingReview {
  id: string;
  productId: string;
  productName: string;
  customerId: string;
  rating: number;
  title?: string;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

interface ApprovedReview extends PendingReview {
  isApproved: boolean;
  approvedAt?: string;
  approvedBy?: string;
}

// API functions
const reviewsApi = {
  getPending: async (): Promise<PendingReview[]> => {
    const response = await client.get('/catalog/reviews/admin/pending');
    return response.data;
  },
  approve: async (reviewId: string): Promise<{ message: string }> => {
    const response = await client.post(`/catalog/reviews/admin/${reviewId}/approve`);
    return response.data;
  },
  reject: async (reviewId: string): Promise<{ message: string }> => {
    const response = await client.delete(`/catalog/reviews/admin/${reviewId}`);
    return response.data;
  },
  getAll: async (params: { page?: number; status?: string; productId?: string }): Promise<{
    reviews: ApprovedReview[];
    total: number;
    page: number;
    pageSize: number;
  }> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.productId) queryParams.append('productId', params.productId);
    const response = await client.get(`/catalog/reviews/admin?${queryParams.toString()}`);
    return response.data;
  }
};

export function ReviewsManagementPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // Fetch pending reviews
  const { data: pendingReviews, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'reviews', 'pending'],
    queryFn: reviewsApi.getPending,
    enabled: statusFilter === 'pending',
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: reviewsApi.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      toast.success('Đã duyệt đánh giá thành công!');
    },
    onError: () => {
      toast.error('Không thể duyệt đánh giá!');
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: reviewsApi.reject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      toast.success('Đã từ chối đánh giá!');
    },
    onError: () => {
      toast.error('Không thể từ chối đánh giá!');
    }
  });

  const handleApprove = (reviewId: string) => {
    approveMutation.mutate(reviewId);
  };

  const handleReject = (reviewId: string) => {
    if (window.confirm('Bạn có chắc muốn từ chối đánh giá này?')) {
      rejectMutation.mutate(reviewId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter reviews by search term
  const filteredReviews = pendingReviews?.filter(review =>
    review.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.title?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý đánh giá</h1>
          <p className="text-gray-500 text-sm mt-1">
            Duyệt và quản lý đánh giá sản phẩm từ khách hàng
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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Chờ duyệt</p>
              <p className="text-2xl font-bold text-gray-900">
                {pendingReviews?.length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Đã duyệt hôm nay</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng đánh giá</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo sản phẩm, nội dung..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
            >
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="all">Tất cả</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-500 mt-3">Đang tải...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Không có đánh giá nào chờ duyệt</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredReviews.map((review) => (
              <div key={review.id} className="p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Product Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900 truncate">
                        {review.productName}
                      </span>
                      {review.isVerifiedPurchase && (
                        <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" />
                          Đã mua hàng
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= review.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-sm text-gray-500 ml-2">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>

                    {/* Title & Comment */}
                    {review.title && (
                      <h4 className="font-medium text-gray-800 mb-1">{review.title}</h4>
                    )}
                    <p className="text-gray-600 text-sm line-clamp-3">{review.comment}</p>

                    {/* Customer ID */}
                    <p className="text-xs text-gray-400 mt-2">
                      Khách hàng: {review.customerId.substring(0, 8)}...
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(review.id)}
                      disabled={approveMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Duyệt
                    </button>
                    <button
                      onClick={() => handleReject(review.id)}
                      disabled={rejectMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Từ chối
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredReviews.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">
            Hiển thị {filteredReviews.length} đánh giá
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 py-2 bg-gray-100 rounded-lg font-medium">
              {page}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewsManagementPage;
