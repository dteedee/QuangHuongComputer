import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Package, MapPin, Shield, CreditCard, Heart,
    ChevronRight, Edit2, Save, X, Plus, Trash2,
    TrendingUp, ShoppingBag, Award, Clock, CheckCircle,
    Eye, XCircle, RotateCcw, Truck, Ban, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi, type UserProfile, type CustomerAddress } from '../api/auth';
import { salesApi, type Order, type OrderStatus } from '../api/sales';
import { formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';

type TabType = 'overview' | 'orders' | 'addresses' | 'security';

const statusConfig: Record<OrderStatus, { label: string; icon: JSX.Element; color: string; bgColor: string }> = {
    'Draft': { label: 'Bản nháp', icon: <Clock className="w-4 h-4" />, color: 'text-gray-700', bgColor: 'bg-gray-100' },
    'Pending': { label: 'Chờ xử lý', icon: <Clock className="w-4 h-4" />, color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    'Confirmed': { label: 'Đã xác nhận', icon: <CheckCircle className="w-4 h-4" />, color: 'text-blue-700', bgColor: 'bg-blue-100' },
    'Paid': { label: 'Đã thanh toán', icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    'Shipped': { label: 'Đang giao', icon: <Truck className="w-4 h-4" />, color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
    'Delivered': { label: 'Đã giao', icon: <Package className="w-4 h-4" />, color: 'text-green-700', bgColor: 'bg-green-100' },
    'Completed': { label: 'Hoàn thành', icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    'Cancelled': { label: 'Đã hủy', icon: <Ban className="w-4 h-4" />, color: 'text-red-700', bgColor: 'bg-red-100' },
};

const tierColors: Record<string, string> = {
    'VIP': 'from-yellow-400 to-amber-600',
    'Gold': 'from-amber-300 to-yellow-500',
    'Silver': 'from-gray-300 to-gray-500',
    'Bronze': 'from-orange-300 to-orange-500',
    'Member': 'from-blue-300 to-blue-500'
};

export const AccountPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'overview');

    // Profile state
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editForm, setEditForm] = useState({ fullName: '', phoneNumber: '', address: '' });

    // Stats state
    const [stats, setStats] = useState<{
        totalOrders: number;
        completedOrders: number;
        pendingOrders: number;
        cancelledOrders: number;
        totalSpent: number;
        monthlySpent: number;
        yearlySpent: number;
        averageOrderValue: number;
        lastOrderDate?: string;
        firstOrderDate?: string;
        customerTier: string;
        loyaltyPoints: number;
    } | null>(null);

    // Orders state
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);
    const [orderFilter, setOrderFilter] = useState<OrderStatus | 'all'>('all');

    // Addresses state
    const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
    const [addressForm, setAddressForm] = useState<Omit<CustomerAddress, 'id'>>({
        recipientName: '',
        phoneNumber: '',
        addressLine: '',
        city: '',
        district: '',
        ward: '',
        postalCode: '',
        isDefault: false,
        addressLabel: ''
    });

    // Password change state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    useEffect(() => {
        loadProfile();
        loadStats();
    }, []);

    useEffect(() => {
        if (activeTab === 'orders' && orders.length === 0) {
            loadOrders();
        }
        if (activeTab === 'addresses' && addresses.length === 0) {
            loadAddresses();
        }
    }, [activeTab]);

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    const loadProfile = async () => {
        try {
            setIsLoadingProfile(true);
            const data = await authApi.getMyProfile();
            setProfile(data);
            setEditForm({
                fullName: data.fullName || '',
                phoneNumber: data.phoneNumber || '',
                address: data.profile?.address || ''
            });
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setIsLoadingProfile(false);
        }
    };

    const loadStats = async () => {
        try {
            const data = await salesApi.getMyStats();
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const loadOrders = async () => {
        try {
            setIsLoadingOrders(true);
            const data = await salesApi.getMyOrders();
            setOrders(data);
        } catch (error) {
            toast.error('Không thể tải danh sách đơn hàng');
        } finally {
            setIsLoadingOrders(false);
        }
    };

    const loadAddresses = async () => {
        try {
            setIsLoadingAddresses(true);
            const data = await authApi.getMyAddresses();
            setAddresses(data);
        } catch (error) {
            console.error('Failed to load addresses:', error);
        } finally {
            setIsLoadingAddresses(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            await authApi.updateMyProfile(editForm);
            toast.success('Cập nhật thông tin thành công');
            setIsEditingProfile(false);
            loadProfile();
        } catch (error) {
            toast.error('Không thể cập nhật thông tin');
        }
    };

    const handleChangePassword = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('Mật khẩu xác nhận không khớp');
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }

        try {
            setIsChangingPassword(true);
            await authApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
            toast.success('Đổi mật khẩu thành công');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể đổi mật khẩu');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleSaveAddress = async () => {
        try {
            if (editingAddress) {
                await authApi.updateAddress(editingAddress.id, addressForm);
                toast.success('Cập nhật địa chỉ thành công');
            } else {
                await authApi.addAddress(addressForm);
                toast.success('Thêm địa chỉ thành công');
            }
            setShowAddressForm(false);
            setEditingAddress(null);
            setAddressForm({
                recipientName: '',
                phoneNumber: '',
                addressLine: '',
                city: '',
                district: '',
                ward: '',
                postalCode: '',
                isDefault: false,
                addressLabel: ''
            });
            loadAddresses();
        } catch (error) {
            toast.error('Không thể lưu địa chỉ');
        }
    };

    const handleDeleteAddress = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa địa chỉ này?')) return;
        try {
            await authApi.deleteAddress(id);
            toast.success('Đã xóa địa chỉ');
            loadAddresses();
        } catch (error) {
            toast.error('Không thể xóa địa chỉ');
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
        try {
            // Call API to cancel order
            await fetch(`/api/sales/orders/${orderId}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ reason: 'Khách hàng yêu cầu hủy' })
            });
            toast.success('Đã hủy đơn hàng');
            loadOrders();
        } catch (error) {
            toast.error('Không thể hủy đơn hàng');
        }
    };

    const filteredOrders = orders.filter(order =>
        orderFilter === 'all' || order.status === orderFilter
    );

    const tabs = [
        { id: 'overview' as TabType, label: 'Tổng quan', icon: <User size={18} /> },
        { id: 'orders' as TabType, label: 'Đơn hàng', icon: <Package size={18} />, badge: stats?.pendingOrders },
        { id: 'addresses' as TabType, label: 'Địa chỉ', icon: <MapPin size={18} /> },
        { id: 'security' as TabType, label: 'Bảo mật', icon: <Shield size={18} /> },
    ];

    if (isLoadingProfile) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#D70018]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 font-sans">
            <div className="max-w-[1400px] mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">
                        Tài khoản <span className="text-[#D70018]">của tôi</span>
                    </h1>
                    <p className="text-gray-500 mt-1">Quản lý thông tin cá nhân và đơn hàng</p>
                </div>

                <div className="grid lg:grid-cols-4 gap-6">
                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                            {/* User Card */}
                            <div className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black">
                                        {profile?.fullName?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{profile?.fullName}</h3>
                                        <p className="text-white/60 text-sm">{profile?.email}</p>
                                    </div>
                                </div>

                                {/* Tier Badge */}
                                {stats && (
                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${tierColors[stats.customerTier]} text-white text-xs font-bold`}>
                                        <Award size={14} />
                                        {stats.customerTier}
                                        <span className="opacity-80">• {stats.loyaltyPoints.toLocaleString()} điểm</span>
                                    </div>
                                )}
                            </div>

                            {/* Navigation */}
                            <nav className="p-4 space-y-1">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                                            activeTab === tab.id
                                                ? 'bg-red-50 text-[#D70018] font-bold'
                                                : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="flex items-center gap-3">
                                            {tab.icon}
                                            {tab.label}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {tab.badge ? (
                                                <span className="bg-[#D70018] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                    {tab.badge}
                                                </span>
                                            ) : null}
                                            <ChevronRight size={16} className="text-gray-300" />
                                        </div>
                                    </button>
                                ))}

                                <div className="pt-4 border-t border-gray-100 mt-4">
                                    <Link
                                        to="/account/wishlist"
                                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-all"
                                    >
                                        <span className="flex items-center gap-3">
                                            <Heart size={18} />
                                            Yêu thích
                                        </span>
                                        <ChevronRight size={16} className="text-gray-300" />
                                    </Link>
                                </div>
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <AnimatePresence mode="wait">
                            {/* Overview Tab */}
                            {activeTab === 'overview' && (
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    {/* Stats Cards */}
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                                                    <ShoppingBag size={20} />
                                                </div>
                                                <span className="text-sm text-gray-500 font-medium">Tổng đơn hàng</span>
                                            </div>
                                            <p className="text-2xl font-black text-gray-900">{stats?.totalOrders || 0}</p>
                                        </div>

                                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 bg-green-100 rounded-xl text-green-600">
                                                    <CheckCircle size={20} />
                                                </div>
                                                <span className="text-sm text-gray-500 font-medium">Hoàn thành</span>
                                            </div>
                                            <p className="text-2xl font-black text-gray-900">{stats?.completedOrders || 0}</p>
                                        </div>

                                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 bg-red-100 rounded-xl text-red-600">
                                                    <CreditCard size={20} />
                                                </div>
                                                <span className="text-sm text-gray-500 font-medium">Tổng chi tiêu</span>
                                            </div>
                                            <p className="text-xl font-black text-[#D70018]">{formatCurrency(stats?.totalSpent || 0)}</p>
                                        </div>

                                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
                                                    <TrendingUp size={20} />
                                                </div>
                                                <span className="text-sm text-gray-500 font-medium">TB mỗi đơn</span>
                                            </div>
                                            <p className="text-xl font-black text-gray-900">{formatCurrency(stats?.averageOrderValue || 0)}</p>
                                        </div>
                                    </div>

                                    {/* Profile Info */}
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                            <h3 className="font-bold text-gray-900 uppercase text-sm tracking-wide">Thông tin cá nhân</h3>
                                            <button
                                                onClick={() => setIsEditingProfile(!isEditingProfile)}
                                                className="flex items-center gap-2 text-[#D70018] text-sm font-bold hover:underline"
                                            >
                                                <Edit2 size={14} />
                                                {isEditingProfile ? 'Hủy' : 'Chỉnh sửa'}
                                            </button>
                                        </div>

                                        <div className="p-6">
                                            {isEditingProfile ? (
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên</label>
                                                        <input
                                                            type="text"
                                                            value={editForm.fullName}
                                                            onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D70018] focus:border-transparent"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại</label>
                                                        <input
                                                            type="tel"
                                                            value={editForm.phoneNumber}
                                                            onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D70018] focus:border-transparent"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-gray-700 mb-1">Địa chỉ</label>
                                                        <input
                                                            type="text"
                                                            value={editForm.address}
                                                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D70018] focus:border-transparent"
                                                        />
                                                    </div>
                                                    <div className="flex gap-3 pt-2">
                                                        <button
                                                            onClick={handleSaveProfile}
                                                            className="flex items-center gap-2 px-6 py-3 bg-[#D70018] text-white rounded-xl font-bold text-sm hover:bg-[#b50014]"
                                                        >
                                                            <Save size={16} />
                                                            Lưu thay đổi
                                                        </button>
                                                        <button
                                                            onClick={() => setIsEditingProfile(false)}
                                                            className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200"
                                                        >
                                                            <X size={16} />
                                                            Hủy
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid sm:grid-cols-2 gap-6">
                                                    <div>
                                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Họ và tên</p>
                                                        <p className="text-gray-900 font-medium">{profile?.fullName || '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Email</p>
                                                        <p className="text-gray-900 font-medium">{profile?.email || '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Số điện thoại</p>
                                                        <p className="text-gray-900 font-medium">{profile?.phoneNumber || '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Địa chỉ</p>
                                                        <p className="text-gray-900 font-medium">{profile?.profile?.address || '—'}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Recent Orders */}
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                            <h3 className="font-bold text-gray-900 uppercase text-sm tracking-wide">Đơn hàng gần đây</h3>
                                            <button
                                                onClick={() => handleTabChange('orders')}
                                                className="text-[#D70018] text-sm font-bold hover:underline"
                                            >
                                                Xem tất cả
                                            </button>
                                        </div>

                                        {orders.length === 0 ? (
                                            <div className="p-12 text-center">
                                                <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                                <p className="text-gray-500">Chưa có đơn hàng nào</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                {orders.slice(0, 3).map((order) => (
                                                    <Link
                                                        key={order.id}
                                                        to={`/account/orders/${order.id}`}
                                                        className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-3 bg-gray-100 rounded-xl">
                                                                <Package size={20} className="text-gray-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900">{order.orderNumber}</p>
                                                                <p className="text-sm text-gray-500">
                                                                    {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className={`text-xs px-3 py-1 rounded-full font-bold ${statusConfig[order.status]?.bgColor} ${statusConfig[order.status]?.color}`}>
                                                                {statusConfig[order.status]?.label}
                                                            </span>
                                                            <span className="font-bold text-[#D70018]">{formatCurrency(order.totalAmount)}</span>
                                                            <ChevronRight size={18} className="text-gray-300" />
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Orders Tab */}
                            {activeTab === 'orders' && (
                                <motion.div
                                    key="orders"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    {/* Filter */}
                                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                            <button
                                                onClick={() => setOrderFilter('all')}
                                                className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition-all whitespace-nowrap ${
                                                    orderFilter === 'all'
                                                        ? 'bg-[#D70018] text-white'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                Tất cả ({orders.length})
                                            </button>
                                            {Object.entries(statusConfig).map(([status, config]) => {
                                                const count = orders.filter(o => o.status === status).length;
                                                if (count === 0) return null;
                                                return (
                                                    <button
                                                        key={status}
                                                        onClick={() => setOrderFilter(status as OrderStatus)}
                                                        className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition-all whitespace-nowrap ${
                                                            orderFilter === status
                                                                ? 'bg-[#D70018] text-white'
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {config.label} ({count})
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Orders List */}
                                    {isLoadingOrders ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="w-8 h-8 animate-spin text-[#D70018]" />
                                        </div>
                                    ) : filteredOrders.length === 0 ? (
                                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                                            <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                            <h3 className="text-xl font-black text-gray-900 mb-2 uppercase italic">Không có đơn hàng</h3>
                                            <p className="text-gray-500">Bạn chưa có đơn hàng nào. Bắt đầu mua sắm ngay!</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {filteredOrders.map((order) => (
                                                <div
                                                    key={order.id}
                                                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                                                >
                                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                                                                    {order.orderNumber}
                                                                </h3>
                                                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1 ${statusConfig[order.status]?.bgColor} ${statusConfig[order.status]?.color}`}>
                                                                    {statusConfig[order.status]?.icon}
                                                                    {statusConfig[order.status]?.label}
                                                                </span>
                                                            </div>

                                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                                                <div>
                                                                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Ngày đặt</p>
                                                                    <p className="text-gray-900 font-bold">{new Date(order.orderDate).toLocaleDateString('vi-VN')}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Số lượng</p>
                                                                    <p className="text-gray-900 font-bold">{order.items.length} sản phẩm</p>
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Tổng tiền</p>
                                                                    <p className="text-[#D70018] font-black text-xl tracking-tight">{formatCurrency(order.totalAmount)}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 lg:flex-col lg:items-stretch">
                                                            <Link
                                                                to={`/account/orders/${order.id}`}
                                                                className="flex-1 lg:flex-none px-6 py-3 bg-[#D70018] hover:bg-[#b50014] text-white font-black rounded-xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                                Xem chi tiết
                                                            </Link>

                                                            {(order.status === 'Pending' || order.status === 'Confirmed') && (
                                                                <button
                                                                    onClick={() => handleCancelOrder(order.id)}
                                                                    className="flex-1 lg:flex-none px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                    Hủy đơn
                                                                </button>
                                                            )}

                                                            {order.status === 'Delivered' && (
                                                                <button
                                                                    onClick={() => navigate(`/account/returns/new?orderId=${order.id}`)}
                                                                    className="flex-1 lg:flex-none px-6 py-3 bg-amber-100 hover:bg-amber-200 text-amber-700 font-black rounded-xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                                                >
                                                                    <RotateCcw className="w-4 h-4" />
                                                                    Đổi trả
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Addresses Tab */}
                            {activeTab === 'addresses' && (
                                <motion.div
                                    key="addresses"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-black text-gray-900 uppercase italic tracking-tight">Sổ địa chỉ</h2>
                                        <button
                                            onClick={() => {
                                                setEditingAddress(null);
                                                setAddressForm({
                                                    recipientName: profile?.fullName || '',
                                                    phoneNumber: profile?.phoneNumber || '',
                                                    addressLine: '',
                                                    city: '',
                                                    district: '',
                                                    ward: '',
                                                    postalCode: '',
                                                    isDefault: addresses.length === 0,
                                                    addressLabel: ''
                                                });
                                                setShowAddressForm(true);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-[#D70018] text-white rounded-xl font-bold text-sm hover:bg-[#b50014]"
                                        >
                                            <Plus size={18} />
                                            Thêm địa chỉ
                                        </button>
                                    </div>

                                    {/* Address Form Modal */}
                                    {showAddressForm && (
                                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                            <h3 className="font-bold text-gray-900 mb-4">
                                                {editingAddress ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}
                                            </h3>
                                            <div className="grid sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Họ tên người nhận</label>
                                                    <input
                                                        type="text"
                                                        value={addressForm.recipientName}
                                                        onChange={(e) => setAddressForm({ ...addressForm, recipientName: e.target.value })}
                                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D70018] focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại</label>
                                                    <input
                                                        type="tel"
                                                        value={addressForm.phoneNumber}
                                                        onChange={(e) => setAddressForm({ ...addressForm, phoneNumber: e.target.value })}
                                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D70018] focus:border-transparent"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Địa chỉ chi tiết</label>
                                                    <input
                                                        type="text"
                                                        value={addressForm.addressLine}
                                                        onChange={(e) => setAddressForm({ ...addressForm, addressLine: e.target.value })}
                                                        placeholder="Số nhà, tên đường..."
                                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D70018] focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Tỉnh/Thành phố</label>
                                                    <input
                                                        type="text"
                                                        value={addressForm.city}
                                                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D70018] focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Quận/Huyện</label>
                                                    <input
                                                        type="text"
                                                        value={addressForm.district}
                                                        onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D70018] focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Phường/Xã</label>
                                                    <input
                                                        type="text"
                                                        value={addressForm.ward}
                                                        onChange={(e) => setAddressForm({ ...addressForm, ward: e.target.value })}
                                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D70018] focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nhãn (Nhà, Văn phòng...)</label>
                                                    <input
                                                        type="text"
                                                        value={addressForm.addressLabel || ''}
                                                        onChange={(e) => setAddressForm({ ...addressForm, addressLabel: e.target.value })}
                                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D70018] focus:border-transparent"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={addressForm.isDefault}
                                                            onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                                                            className="w-4 h-4 rounded border-gray-300 text-[#D70018] focus:ring-[#D70018]"
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">Đặt làm địa chỉ mặc định</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="flex gap-3 mt-6">
                                                <button
                                                    onClick={handleSaveAddress}
                                                    className="flex items-center gap-2 px-6 py-3 bg-[#D70018] text-white rounded-xl font-bold text-sm hover:bg-[#b50014]"
                                                >
                                                    <Save size={16} />
                                                    Lưu địa chỉ
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowAddressForm(false);
                                                        setEditingAddress(null);
                                                    }}
                                                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200"
                                                >
                                                    <X size={16} />
                                                    Hủy
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Addresses List */}
                                    {isLoadingAddresses ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="w-8 h-8 animate-spin text-[#D70018]" />
                                        </div>
                                    ) : addresses.length === 0 ? (
                                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                                            <MapPin className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                            <h3 className="text-xl font-black text-gray-900 mb-2 uppercase italic">Chưa có địa chỉ</h3>
                                            <p className="text-gray-500">Thêm địa chỉ giao hàng để đặt hàng nhanh hơn</p>
                                        </div>
                                    ) : (
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {addresses.map((address) => (
                                                <div
                                                    key={address.id}
                                                    className={`bg-white rounded-2xl p-5 border ${address.isDefault ? 'border-[#D70018]' : 'border-gray-100'} shadow-sm relative`}
                                                >
                                                    {address.isDefault && (
                                                        <span className="absolute top-3 right-3 bg-[#D70018] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                                            Mặc định
                                                        </span>
                                                    )}
                                                    <div className="mb-3">
                                                        <p className="font-bold text-gray-900">{address.recipientName}</p>
                                                        <p className="text-sm text-gray-600">{address.phoneNumber}</p>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-4">
                                                        {address.addressLine}, {address.ward}, {address.district}, {address.city}
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingAddress(address);
                                                                setAddressForm({
                                                                    recipientName: address.recipientName,
                                                                    phoneNumber: address.phoneNumber,
                                                                    addressLine: address.addressLine,
                                                                    city: address.city,
                                                                    district: address.district,
                                                                    ward: address.ward,
                                                                    postalCode: address.postalCode || '',
                                                                    isDefault: address.isDefault || false,
                                                                    addressLabel: address.addressLabel || ''
                                                                });
                                                                setShowAddressForm(true);
                                                            }}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200"
                                                        >
                                                            <Edit2 size={12} />
                                                            Sửa
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAddress(address.id)}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100"
                                                        >
                                                            <Trash2 size={12} />
                                                            Xóa
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Security Tab */}
                            {activeTab === 'security' && (
                                <motion.div
                                    key="security"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-gray-100">
                                            <h3 className="font-bold text-gray-900 uppercase text-sm tracking-wide">Đổi mật khẩu</h3>
                                        </div>

                                        <div className="p-6 space-y-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu hiện tại</label>
                                                <input
                                                    type="password"
                                                    value={passwordForm.currentPassword}
                                                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D70018] focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu mới</label>
                                                <input
                                                    type="password"
                                                    value={passwordForm.newPassword}
                                                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D70018] focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                                                <input
                                                    type="password"
                                                    value={passwordForm.confirmPassword}
                                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D70018] focus:border-transparent"
                                                />
                                            </div>
                                            <div className="pt-2">
                                                <button
                                                    onClick={handleChangePassword}
                                                    disabled={isChangingPassword}
                                                    className="flex items-center gap-2 px-6 py-3 bg-[#D70018] text-white rounded-xl font-bold text-sm hover:bg-[#b50014] disabled:opacity-50"
                                                >
                                                    {isChangingPassword ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Shield size={16} />
                                                    )}
                                                    Đổi mật khẩu
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Account Info */}
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-gray-100">
                                            <h3 className="font-bold text-gray-900 uppercase text-sm tracking-wide">Thông tin tài khoản</h3>
                                        </div>

                                        <div className="p-6 space-y-4">
                                            <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                                <span className="text-gray-600">Email đăng ký</span>
                                                <span className="font-medium text-gray-900">{profile?.email}</span>
                                            </div>
                                            <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                                <span className="text-gray-600">Xác thực email</span>
                                                <span className={`font-medium ${profile?.emailVerified ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {profile?.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between py-3">
                                                <span className="text-gray-600">Đăng nhập gần nhất</span>
                                                <span className="font-medium text-gray-900">
                                                    {profile?.lastLoginAt
                                                        ? new Date(profile.lastLoginAt).toLocaleString('vi-VN')
                                                        : 'Không xác định'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};
