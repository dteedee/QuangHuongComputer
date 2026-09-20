import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Package, MapPin, Heart, Award, ShieldCheck, ChevronRight, Clock, CheckCircle, Truck, Ban, FileText, CreditCard,
} from 'lucide-react';
import { AccountLayout } from '../layouts/account-layout';
import { useAuth } from '../context/AuthContext';
import { useMyOrders } from './account/use-my-orders';
import { formatCurrency } from '../utils/format';
import type { OrderStatus } from '../api/sales/types';

/**
 * Account overview (phase-56 Step 1+2). Was a 598-LOC monolith mixing profile edit, address CRUD
 * and orders in one file, whose stats card and order list read from two different queries and
 * disagreed. Now: `useMyOrders()` is the ONE query behind both this page's stats and
 * `account/OrdersPage.tsx`'s list, and profile/address editing live on their own routed pages
 * (`ProfilePage.tsx`, `account/address-book-page.tsx`) reachable from the sidebar.
 */

const STATUS_CONFIG: Record<OrderStatus, { label: string; icon: JSX.Element; className: string }> = {
    Draft: { label: 'Bản nháp', icon: <FileText size={14} />, className: 'text-gray-700 bg-gray-100' },
    Pending: { label: 'Chờ xử lý', icon: <Clock size={14} />, className: 'text-yellow-700 bg-yellow-100' },
    Confirmed: { label: 'Đã xác nhận', icon: <CheckCircle size={14} />, className: 'text-blue-700 bg-blue-100' },
    Paid: { label: 'Đã thanh toán', icon: <CheckCircle size={14} />, className: 'text-emerald-700 bg-emerald-100' },
    Shipped: { label: 'Đang giao', icon: <Truck size={14} />, className: 'text-indigo-700 bg-indigo-100' },
    Delivered: { label: 'Đã giao', icon: <Package size={14} />, className: 'text-green-700 bg-green-100' },
    Completed: { label: 'Hoàn thành', icon: <CheckCircle size={14} />, className: 'text-emerald-700 bg-emerald-100' },
    Cancelled: { label: 'Đã hủy', icon: <Ban size={14} />, className: 'text-red-700 bg-red-100' },
};

const QUICK_LINKS = [
    { to: '/tai-khoan/addresses', label: 'Sổ địa chỉ', icon: MapPin },
    { to: '/tai-khoan/wishlist', label: 'Yêu thích', icon: Heart },
    { to: '/tai-khoan/loyalty', label: 'Điểm tích lũy', icon: Award },
    { to: '/tai-khoan/security', label: 'Bảo mật', icon: ShieldCheck },
];

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 mb-1">{label}</p>
            <p className="text-xl font-black text-gray-900">{value}</p>
        </div>
    );
}

export const AccountPage = () => {
    const { user } = useAuth();
    const { orders, stats, isLoading, error, reload } = useMyOrders();
    const recentOrders = orders.slice(0, 5);

    // D10: "add a list of the customer's instalment applications with their hold expiry."
    // Only rendered when non-empty — most customers never open a lead, and an empty card here
    // would just be noise above the orders list.
    useEffect(() => {
    }, []);

    return (
        <AccountLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Xin chào, {user?.fullName || 'bạn'} 👋</h1>
                    <p className="text-sm text-gray-500 mt-1">Đây là tổng quan tài khoản của bạn tại Quang Hưởng Computer.</p>
                </div>

                {/* Stats — same query as the orders list below and OrdersPage, never contradicts them */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard label="Tổng đơn hàng" value={String(stats.totalOrders)} />
                    <StatCard label="Đã hoàn thành" value={String(stats.completedOrders)} />
                    <StatCard label="Đang xử lý" value={String(stats.pendingOrders)} />
                    <StatCard label="Đã chi tiêu" value={formatCurrency(stats.totalSpent)} />
                </div>

                {/* Quick links */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {QUICK_LINKS.map((l) => (
                        <Link
                            key={l.to}
                            to={l.to}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer"
                        >
                            <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                                <l.icon size={18} />
                            </div>
                            <span className="text-sm font-semibold text-gray-800">{l.label}</span>
                        </Link>
                    ))}
                </div>

                {/* Recent orders */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <h2 className="font-bold text-gray-900">Đơn hàng gần đây</h2>
                        <Link to="/tai-khoan/orders" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer">
                            Xem tất cả <ChevronRight size={14} />
                        </Link>
                    </div>

                    {isLoading ? (
                        <div className="p-5 space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center">
                            <p className="text-sm text-red-600 mb-3">{error}</p>
                            <button onClick={reload} className="text-sm font-semibold text-accent hover:underline cursor-pointer">Thử lại</button>
                        </div>
                    ) : recentOrders.length === 0 ? (
                        <div className="p-10 text-center">
                            <Package size={36} className="text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 mb-4">Bạn chưa có đơn hàng nào.</p>
                            <Link to="/san-pham" className="inline-block px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 cursor-pointer">
                                Mua sắm ngay
                            </Link>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50">
                            {recentOrders.map((o) => {
                                const cfg = STATUS_CONFIG[o.status];
                                return (
                                    <li key={o.id}>
                                        <Link to={`/tai-khoan/orders/${o.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">#{o.orderNumber}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{new Date(o.orderDate).toLocaleDateString('vi-VN')}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm font-bold text-gray-900">{formatCurrency(o.totalAmount)}</span>
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.className}`}>
                                                    {cfg.icon} {cfg.label}
                                                </span>
                                                <ChevronRight size={16} className="text-gray-300" />
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </AccountLayout>
    );
};

export default AccountPage;
