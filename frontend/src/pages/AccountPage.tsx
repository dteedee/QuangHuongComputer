import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Package, MapPin, Shield, CreditCard, ChevronRight,
    Edit2, Save, X, Plus, Trash2, TrendingUp, ShoppingBag,
    Award, Clock, CheckCircle, Eye, XCircle, RotateCcw,
    Truck, Ban, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi, type UserProfile, type CustomerAddress } from '../api/auth';
import { salesApi, type Order, type OrderStatus } from '../api/sales';
import { formatCurrency } from '../utils/format';
import { useConfirm } from '../context/ConfirmContext';
import toast from 'react-hot-toast';

type TabType = 'overview' | 'orders' | 'addresses' | 'security';

const statusConfig: Record<OrderStatus, { label: string; icon: JSX.Element; color: string; bgColor: string }> = {
    'Draft':     { label: 'Bản nháp',      icon: <Clock className="w-4 h-4" />,       color: 'text-gray-700',    bgColor: 'bg-gray-100' },
    'Pending':   { label: 'Chờ xử lý',     icon: <Clock className="w-4 h-4" />,       color: 'text-yellow-700',  bgColor: 'bg-yellow-100' },
    'Confirmed': { label: 'Đã xác nhận',   icon: <CheckCircle className="w-4 h-4" />, color: 'text-blue-700',    bgColor: 'bg-blue-100' },
    'Paid':      { label: 'Đã thanh toán', icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    'Shipped':   { label: 'Đang giao',     icon: <Truck className="w-4 h-4" />,       color: 'text-indigo-700',  bgColor: 'bg-indigo-100' },
    'Delivered': { label: 'Đã giao',       icon: <Package className="w-4 h-4" />,     color: 'text-green-700',   bgColor: 'bg-green-100' },
    'Completed': { label: 'Hoàn thành',    icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    'Cancelled': { label: 'Đã hủy',        icon: <Ban className="w-4 h-4" />,         color: 'text-red-700',     bgColor: 'bg-red-100' },
};

const tierColors: Record<string, string> = {
    'VIP': 'from-yellow-400 to-amber-600', 'Gold': 'from-amber-300 to-yellow-500',
    'Silver': 'from-gray-300 to-gray-500', 'Bronze': 'from-orange-300 to-orange-500',
    'Member': 'from-blue-300 to-blue-500'
};

const inputCls = 'w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-gray-900 bg-white';
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1';
const cardCls = 'bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden';

const emptyAddressForm: Omit<CustomerAddress, 'id'> = {
    recipientName: '', phoneNumber: '', addressLine: '', city: '',
    district: '', ward: '', postalCode: '', isDefault: false, addressLabel: ''
};

export const AccountPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user, logout } = useAuth();
    const confirm = useConfirm();
    const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'overview');

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [editForm, setEditForm] = useState({ fullName: '', phoneNumber: '', address: '' });

    const [stats, setStats] = useState<{
        totalOrders: number; completedOrders: number; pendingOrders: number;
        cancelledOrders: number; totalSpent: number; monthlySpent: number;
        yearlySpent: number; averageOrderValue: number; lastOrderDate?: string;
        firstOrderDate?: string; customerTier: string; loyaltyPoints: number;
    } | null>(null);

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);
    const [orderFilter, setOrderFilter] = useState<OrderStatus | 'all'>('all');

    const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
    const [addressForm, setAddressForm] = useState<Omit<CustomerAddress, 'id'>>(emptyAddressForm);

    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    useEffect(() => { loadProfile(); loadStats(); }, []);

    useEffect(() => {
        if (activeTab === 'orders' && orders.length === 0) loadOrders();
        if (activeTab === 'addresses' && addresses.length === 0) loadAddresses();
    }, [activeTab]);

    const handleTabChange = (tab: TabType) => { setActiveTab(tab); setSearchParams({ tab }); };

    const loadProfile = async () => {
        try {
            setIsLoadingProfile(true);
            const data = await authApi.getMyProfile();
            setProfile(data);
            setEditForm({ fullName: data.fullName || '', phoneNumber: data.phoneNumber || '', address: data.profile?.address || '' });
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally { setIsLoadingProfile(false); }
    };

    const loadStats = async () => {
        try { setStats(await salesApi.getMyStats()); } catch { /* silent */ }
    };

    const loadOrders = async () => {
        try {
            setIsLoadingOrders(true);
            setOrders(await salesApi.getMyOrders());
        } catch { toast.error('Không thể tải danh sách đơn hàng'); }
        finally { setIsLoadingOrders(false); }
    };

    const loadAddresses = async () => {
        try {
            setIsLoadingAddresses(true);
            setAddresses(await authApi.getMyAddresses());
        } catch (error) { console.error('Failed to load addresses:', error); }
        finally { setIsLoadingAddresses(false); }
    };

    const handleSaveProfile = async () => {
        if (!editForm.fullName.trim()) { toast.error('Vui lòng nhập họ và tên'); return; }
        try {
            setIsSavingProfile(true);
            await authApi.updateMyProfile(editForm);
            toast.success('Cập nhật thông tin thành công');
            setIsEditingProfile(false);
            await loadProfile();
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.response?.data?.Message || 'Không thể cập nhật thông tin');
        } finally { setIsSavingProfile(false); }
    };

    const handleChangePassword = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Mật khẩu xác nhận không khớp'); return; }
        if (passwordForm.newPassword.length < 6) { toast.error('Mật khẩu mới phải có ít nhất 6 ký tự'); return; }
        try {
            setIsChangingPassword(true);
            await authApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
            toast.success('Đổi mật khẩu thành công');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể đổi mật khẩu');
        } finally { setIsChangingPassword(false); }
    };

    const handleSaveAddress = async () => {
        try {
            if (editingAddress) { await authApi.updateAddress(editingAddress.id, addressForm); toast.success('Cập nhật địa chỉ thành công'); }
            else { await authApi.addAddress(addressForm); toast.success('Thêm địa chỉ thành công'); }
            setShowAddressForm(false);
            setEditingAddress(null);
            setAddressForm(emptyAddressForm);
            loadAddresses();
        } catch { toast.error('Không thể lưu địa chỉ'); }
    };

    const handleDeleteAddress = async (id: string) => {
        const ok = await confirm({ message: 'Bạn có chắc muốn xóa địa chỉ này?', variant: 'danger' });
        if (!ok) return;
        try { await authApi.deleteAddress(id); toast.success('Đã xóa địa chỉ'); loadAddresses(); }
        catch { toast.error('Không thể xóa địa chỉ'); }
    };

    const handleCancelOrder = async (orderId: string) => {
        const ok = await confirm({ message: 'Bạn có chắc chắn muốn hủy đơn hàng này?', variant: 'warning' });
        if (!ok) return;
        try {
            await fetch(`/api/sales/orders/${orderId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ reason: 'Khách hàng yêu cầu hủy' })
            });
            toast.success('Đã hủy đơn hàng');
            loadOrders();
        } catch { toast.error('Không thể hủy đơn hàng'); }
    };

    const filteredOrders = orders.filter(o => orderFilter === 'all' || o.status === orderFilter);

    const tabs = [
        { id: 'overview' as TabType, label: 'Tổng quan', icon: <User size={18} /> },
        { id: 'orders' as TabType, label: 'Đơn hàng', icon: <Package size={18} />, badge: stats?.pendingOrders },
        { id: 'addresses' as TabType, label: 'Địa chỉ', icon: <MapPin size={18} /> },
        { id: 'security' as TabType, label: 'Bảo mật', icon: <Shield size={18} /> },
    ];

    if (isLoadingProfile) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-8 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Tài khoản <span className="text-accent">của tôi</span></h1>
                    <p className="text-gray-500 text-sm mt-1">Quản lý thông tin cá nhân và đơn hàng</p>
                </div>

                <div className="grid lg:grid-cols-4 gap-6">
                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className={`${cardCls} rounded-xl sticky top-24`}>
                            <div className="p-5 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-xl font-bold">
                                        {profile?.fullName?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold">{profile?.fullName}</h3>
                                        <p className="text-white/60 text-xs">{profile?.email}</p>
                                    </div>
                                </div>
                                {stats && (
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${tierColors[stats.customerTier] || tierColors['Member']} text-white text-xs font-bold`}>
                                        <Award size={12} />
                                        {stats.customerTier} • {stats.loyaltyPoints.toLocaleString()} điểm
                                    </div>
                                )}
                            </div>
                            <nav className="p-3 space-y-1">
                                {tabs.map(tab => (
                                    <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all text-sm ${
                                            activeTab === tab.id ? 'bg-red-50 text-accent font-bold' : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2.5">{tab.icon}{tab.label}</span>
                                        <div className="flex items-center gap-1.5">
                                            {tab.badge ? <span className="bg-accent text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{tab.badge}</span> : null}
                                            <ChevronRight size={14} className="text-gray-300" />
                                        </div>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <AnimatePresence mode="wait">

                            {/* Overview Tab */}
                            {activeTab === 'overview' && (
                                <motion.div key="overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">
                                    {/* Stats */}
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            { icon: <ShoppingBag size={18} />, color: 'bg-blue-100 text-blue-600', label: 'Tổng đơn hàng', value: stats?.totalOrders || 0 },
                                            { icon: <CheckCircle size={18} />, color: 'bg-green-100 text-green-600', label: 'Hoàn thành', value: stats?.completedOrders || 0 },
                                            { icon: <CreditCard size={18} />, color: 'bg-red-100 text-red-600', label: 'Tổng chi tiêu', value: formatCurrency(stats?.totalSpent || 0) },
                                            { icon: <TrendingUp size={18} />, color: 'bg-purple-100 text-purple-600', label: 'TB mỗi đơn', value: formatCurrency(stats?.averageOrderValue || 0) },
                                        ].map((stat, i) => (
                                            <div key={i} className={`${cardCls} p-4`}>
                                                <div className={`w-9 h-9 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>{stat.icon}</div>
                                                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                                                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Profile Info Card */}
                                    <div className={cardCls}>
                                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                            <h3 className="font-bold text-gray-900 text-sm">Thông tin cá nhân</h3>
                                            <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="flex items-center gap-1.5 text-accent text-sm font-semibold hover:underline">
                                                <Edit2 size={14} />{isEditingProfile ? 'Hủy' : 'Chỉnh sửa'}
                                            </button>
                                        </div>
                                        <div className="p-5">
                                            {isEditingProfile ? (
                                                <div className="space-y-4">
                                                    {[
                                                        { label: 'Họ và tên *', key: 'fullName', type: 'text', placeholder: 'Nhập họ và tên' },
                                                        { label: 'Số điện thoại', key: 'phoneNumber', type: 'tel', placeholder: 'Nhập số điện thoại' },
                                                        { label: 'Địa chỉ', key: 'address', type: 'text', placeholder: 'Nhập địa chỉ' },
                                                    ].map(f => (
                                                        <div key={f.key}>
                                                            <label className={labelCls}>{f.label}</label>
                                                            <input type={f.type} placeholder={f.placeholder}
                                                                value={(editForm as any)[f.key]}
                                                                onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })}
                                                                className={inputCls}
                                                            />
                                                        </div>
                                                    ))}
                                                    <div className="flex gap-3 pt-1">
                                                        <button onClick={handleSaveProfile} disabled={!editForm.fullName.trim() || isSavingProfile}
                                                            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl font-semibold text-sm disabled:opacity-50"
                                                        >
                                                            {isSavingProfile ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                                            {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                                                        </button>
                                                        <button onClick={() => setIsEditingProfile(false)} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200">
                                                            <X size={15} />Hủy
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid sm:grid-cols-2 gap-5">
                                                    {[
                                                        { label: 'Họ và tên', value: profile?.fullName },
                                                        { label: 'Email', value: profile?.email },
                                                        { label: 'Số điện thoại', value: profile?.phoneNumber },
                                                        { label: 'Địa chỉ', value: profile?.profile?.address },
                                                    ].map(f => (
                                                        <div key={f.label}>
                                                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{f.label}</p>
                                                            <p className="text-gray-900 font-medium">{f.value || '—'}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Recent Orders */}
                                    <div className={cardCls}>
                                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                            <h3 className="font-bold text-gray-900 text-sm">Đơn hàng gần đây</h3>
                                            <button onClick={() => handleTabChange('orders')} className="text-accent text-sm font-semibold hover:underline">Xem tất cả</button>
                                        </div>
                                        {orders.length === 0 ? (
                                            <div className="p-10 text-center">
                                                <Package className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                                                <p className="text-gray-500 text-sm">Chưa có đơn hàng nào</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                {orders.slice(0, 3).map(order => (
                                                    <Link key={order.id} to={`/account/orders/${order.id}`}
                                                        className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2.5 bg-gray-100 rounded-xl"><Package size={18} className="text-gray-500" /></div>
                                                            <div>
                                                                <p className="font-bold text-gray-900 text-sm">{order.orderNumber}</p>
                                                                <p className="text-xs text-gray-500">{new Date(order.orderDate).toLocaleDateString('vi-VN')}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${statusConfig[order.status]?.bgColor} ${statusConfig[order.status]?.color}`}>
                                                                {statusConfig[order.status]?.label}
                                                            </span>
                                                            <span className="font-bold text-accent text-sm">{formatCurrency(order.totalAmount)}</span>
                                                            <ChevronRight size={16} className="text-gray-300" />
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
                                <motion.div key="orders" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">
                                    <div className={`${cardCls} p-4`}>
                                        <div className="flex flex-wrap gap-2">
                                            <button onClick={() => setOrderFilter('all')}
                                                className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wide transition-all ${orderFilter === 'all' ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                            >
                                                Tất cả ({orders.length})
                                            </button>
                                            {Object.entries(statusConfig).map(([status, config]) => {
                                                const count = orders.filter(o => o.status === status).length;
                                                if (count === 0) return null;
                                                return (
                                                    <button key={status} onClick={() => setOrderFilter(status as OrderStatus)}
                                                        className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wide transition-all ${orderFilter === status ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                    >
                                                        {config.label} ({count})
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {isLoadingOrders ? (
                                        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
                                    ) : filteredOrders.length === 0 ? (
                                        <div className={`${cardCls} p-12 text-center`}>
                                            <Package className="w-14 h-14 mx-auto text-gray-300 mb-3" />
                                            <p className="font-bold text-gray-900 mb-1">Không có đơn hàng</p>
                                            <p className="text-gray-500 text-sm">Bắt đầu mua sắm ngay!</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {filteredOrders.map(order => (
                                                <div key={order.id} className={`${cardCls} p-5`}>
                                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <h3 className="font-bold text-gray-900">{order.orderNumber}</h3>
                                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${statusConfig[order.status]?.bgColor} ${statusConfig[order.status]?.color}`}>
                                                                    {statusConfig[order.status]?.icon}{statusConfig[order.status]?.label}
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-3 text-sm">
                                                                <div>
                                                                    <p className="text-gray-400 text-xs font-semibold mb-0.5">Ngày đặt</p>
                                                                    <p className="font-medium text-gray-900">{new Date(order.orderDate).toLocaleDateString('vi-VN')}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-400 text-xs font-semibold mb-0.5">Số lượng</p>
                                                                    <p className="font-medium text-gray-900">{order.items.length} sản phẩm</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-400 text-xs font-semibold mb-0.5">Tổng tiền</p>
                                                                    <p className="font-bold text-accent">{formatCurrency(order.totalAmount)}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 flex-wrap">
                                                            <Link to={`/account/orders/${order.id}`}
                                                                className="px-4 py-2 bg-accent text-white font-semibold rounded-xl text-xs uppercase tracking-wide flex items-center gap-1.5 hover:bg-red-700"
                                                            >
                                                                <Eye className="w-4 h-4" />Xem chi tiết
                                                            </Link>
                                                            {(order.status === 'Pending' || order.status === 'Confirmed') && (
                                                                <button onClick={() => handleCancelOrder(order.id)}
                                                                    className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl text-xs uppercase tracking-wide flex items-center gap-1.5 hover:bg-gray-200"
                                                                >
                                                                    <XCircle className="w-4 h-4" />Hủy đơn
                                                                </button>
                                                            )}
                                                            {order.status === 'Delivered' && (
                                                                <button onClick={() => navigate(`/account/returns/new?orderId=${order.id}`)}
                                                                    className="px-4 py-2 bg-amber-100 text-amber-700 font-semibold rounded-xl text-xs uppercase tracking-wide flex items-center gap-1.5 hover:bg-amber-200"
                                                                >
                                                                    <RotateCcw className="w-4 h-4" />Đổi trả
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
                                <motion.div key="addresses" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-bold text-gray-900">Sổ địa chỉ</h2>
                                        <button
                                            onClick={() => {
                                                setEditingAddress(null);
                                                setAddressForm({ ...emptyAddressForm, recipientName: profile?.fullName || '', phoneNumber: profile?.phoneNumber || '', isDefault: addresses.length === 0 });
                                                setShowAddressForm(true);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl font-semibold text-sm hover:bg-red-700"
                                        >
                                            <Plus size={16} />Thêm địa chỉ
                                        </button>
                                    </div>

                                    {showAddressForm && (
                                        <div className={`${cardCls} p-5`}>
                                            <h3 className="font-bold text-gray-900 mb-4 text-sm">{editingAddress ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</h3>
                                            <div className="grid sm:grid-cols-2 gap-4">
                                                {[
                                                    { label: 'Họ tên người nhận', key: 'recipientName', type: 'text' },
                                                    { label: 'Số điện thoại', key: 'phoneNumber', type: 'tel' },
                                                ].map(f => (
                                                    <div key={f.key}>
                                                        <label className={labelCls}>{f.label}</label>
                                                        <input type={f.type} value={(addressForm as any)[f.key]} onChange={e => setAddressForm({ ...addressForm, [f.key]: e.target.value })} className={inputCls} />
                                                    </div>
                                                ))}
                                                <div className="sm:col-span-2">
                                                    <label className={labelCls}>Địa chỉ chi tiết</label>
                                                    <input type="text" value={addressForm.addressLine} onChange={e => setAddressForm({ ...addressForm, addressLine: e.target.value })} placeholder="Số nhà, tên đường..." className={inputCls} />
                                                </div>
                                                {[
                                                    { label: 'Tỉnh/Thành phố', key: 'city' },
                                                    { label: 'Quận/Huyện', key: 'district' },
                                                    { label: 'Phường/Xã', key: 'ward' },
                                                    { label: 'Nhãn (Nhà, Văn phòng...)', key: 'addressLabel' },
                                                ].map(f => (
                                                    <div key={f.key}>
                                                        <label className={labelCls}>{f.label}</label>
                                                        <input type="text" value={(addressForm as any)[f.key] || ''} onChange={e => setAddressForm({ ...addressForm, [f.key]: e.target.value })} className={inputCls} />
                                                    </div>
                                                ))}
                                                <div className="sm:col-span-2">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={addressForm.isDefault} onChange={e => setAddressForm({ ...addressForm, isDefault: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-accent" />
                                                        <span className="text-sm font-medium text-gray-700">Đặt làm địa chỉ mặc định</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="flex gap-3 mt-5">
                                                <button onClick={handleSaveAddress} className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl font-semibold text-sm hover:bg-red-700">
                                                    <Save size={15} />Lưu địa chỉ
                                                </button>
                                                <button onClick={() => { setShowAddressForm(false); setEditingAddress(null); }} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200">
                                                    <X size={15} />Hủy
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {isLoadingAddresses ? (
                                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
                                    ) : addresses.length === 0 ? (
                                        <div className={`${cardCls} p-10 text-center`}>
                                            <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                            <p className="font-bold text-gray-900 mb-1">Chưa có địa chỉ</p>
                                            <p className="text-gray-500 text-sm">Thêm địa chỉ giao hàng để đặt hàng nhanh hơn</p>
                                        </div>
                                    ) : (
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {addresses.map(address => (
                                                <div key={address.id} className={`${cardCls} p-4 relative ${address.isDefault ? 'border-accent' : ''}`}>
                                                    {address.isDefault && (
                                                        <span className="absolute top-3 right-3 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Mặc định</span>
                                                    )}
                                                    <p className="font-bold text-gray-900 mb-0.5">{address.recipientName}</p>
                                                    <p className="text-sm text-gray-600 mb-1">{address.phoneNumber}</p>
                                                    <p className="text-sm text-gray-500 mb-3">{address.addressLine}, {address.ward}, {address.district}, {address.city}</p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingAddress(address);
                                                                setAddressForm({ recipientName: address.recipientName, phoneNumber: address.phoneNumber, addressLine: address.addressLine, city: address.city, district: address.district, ward: address.ward, postalCode: address.postalCode || '', isDefault: address.isDefault || false, addressLabel: address.addressLabel || '' });
                                                                setShowAddressForm(true);
                                                            }}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200"
                                                        >
                                                            <Edit2 size={12} />Sửa
                                                        </button>
                                                        <button onClick={() => handleDeleteAddress(address.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">
                                                            <Trash2 size={12} />Xóa
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
                                <motion.div key="security" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">
                                    <div className={cardCls}>
                                        <div className="px-5 py-4 border-b border-gray-100">
                                            <h3 className="font-bold text-gray-900 text-sm">Đổi mật khẩu</h3>
                                        </div>
                                        <div className="p-5 space-y-4">
                                            {[
                                                { label: 'Mật khẩu hiện tại', key: 'currentPassword' },
                                                { label: 'Mật khẩu mới', key: 'newPassword' },
                                                { label: 'Xác nhận mật khẩu mới', key: 'confirmPassword' },
                                            ].map(f => (
                                                <div key={f.key}>
                                                    <label className={labelCls}>{f.label}</label>
                                                    <input type="password" value={(passwordForm as any)[f.key]} onChange={e => setPasswordForm({ ...passwordForm, [f.key]: e.target.value })} className={inputCls} />
                                                </div>
                                            ))}
                                            <button onClick={handleChangePassword} disabled={isChangingPassword}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-red-700"
                                            >
                                                {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield size={15} />}
                                                Đổi mật khẩu
                                            </button>
                                        </div>
                                    </div>

                                    <div className={cardCls}>
                                        <div className="px-5 py-4 border-b border-gray-100">
                                            <h3 className="font-bold text-gray-900 text-sm">Thông tin tài khoản</h3>
                                        </div>
                                        <div className="p-5 divide-y divide-gray-100">
                                            {[
                                                { label: 'Email đăng ký', value: profile?.email, color: '' },
                                                { label: 'Xác thực email', value: profile?.emailVerified ? 'Đã xác thực' : 'Chưa xác thực', color: profile?.emailVerified ? 'text-green-600' : 'text-amber-600' },
                                                { label: 'Đăng nhập gần nhất', value: profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString('vi-VN') : 'Không xác định', color: '' },
                                            ].map(f => (
                                                <div key={f.label} className="flex items-center justify-between py-3">
                                                    <span className="text-gray-600 text-sm">{f.label}</span>
                                                    <span className={`font-medium text-sm ${f.color || 'text-gray-900'}`}>{f.value}</span>
                                                </div>
                                            ))}
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
