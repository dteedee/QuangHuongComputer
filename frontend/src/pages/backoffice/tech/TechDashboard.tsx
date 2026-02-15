import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Wrench, Clock, CheckCircle2, AlertCircle, Play, Calendar,
    TrendingUp, DollarSign, Star, Timer, Target, Award,
    ChevronRight, CalendarDays, ClipboardList, User, Briefcase,
    CheckSquare, XCircle, Coffee, LogIn, LogOut
} from 'lucide-react';
import { repairApi, getStatusColor } from '../../../api/repair';
import type { WorkOrder } from '../../../api/repair';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

export const TechDashboard: React.FC = () => {
    const { user } = useAuth();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Fetch work orders
    const { data: workOrdersResponse, isLoading } = useQuery({
        queryKey: ['tech-my-work-orders'],
        queryFn: () => repairApi.technician.getMyWorkOrders(),
    });

    const workOrders = workOrdersResponse?.workOrders || [];

    // Mock data cho ngày công và lương (sẽ được thay thế bằng API thực)
    const attendanceData = useMemo(() => {
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const today = new Date();
        const currentDay = today.getMonth() === selectedMonth && today.getFullYear() === selectedYear
            ? today.getDate()
            : daysInMonth;

        // Mock attendance records
        const records: { date: number; checkIn?: string; checkOut?: string; status: 'present' | 'absent' | 'late' | 'leave' | 'future' }[] = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(selectedYear, selectedMonth, day);
            const dayOfWeek = date.getDay();

            if (day > currentDay) {
                records.push({ date: day, status: 'future' });
            } else if (dayOfWeek === 0) {
                // Chủ nhật - nghỉ
                records.push({ date: day, status: 'leave' });
            } else if (Math.random() > 0.9) {
                // 10% nghỉ phép
                records.push({ date: day, status: 'leave' });
            } else if (Math.random() > 0.85) {
                // 15% đi muộn
                records.push({ date: day, checkIn: '08:' + (15 + Math.floor(Math.random() * 30)), checkOut: '17:30', status: 'late' });
            } else {
                records.push({ date: day, checkIn: '08:0' + Math.floor(Math.random() * 10), checkOut: '17:30', status: 'present' });
            }
        }

        return records;
    }, [selectedMonth, selectedYear]);

    // Calculate statistics
    const stats = useMemo(() => {
        const totalWorkDays = attendanceData.filter(d => d.status === 'present' || d.status === 'late').length;
        const leaveDays = attendanceData.filter(d => d.status === 'leave').length;
        const lateDays = attendanceData.filter(d => d.status === 'late').length;

        const completedOrders = workOrders.filter(w => w.status === 'Completed').length;
        const inProgressOrders = workOrders.filter(w => w.status === 'InProgress').length;
        const pendingOrders = workOrders.filter(w => w.status === 'Assigned' || w.status === 'Requested').length;

        // Mock salary calculation
        const baseSalary = 8000000; // 8 triệu base
        const perOrderBonus = 50000; // 50k/đơn hoàn thành
        const estimatedSalary = baseSalary + (completedOrders * perOrderBonus);

        // Performance rating (mock)
        const avgRating = 4.5 + Math.random() * 0.5;
        const completionRate = completedOrders > 0 ? Math.min(100, (completedOrders / (completedOrders + inProgressOrders + pendingOrders)) * 100) : 0;

        return {
            totalWorkDays,
            leaveDays,
            lateDays,
            completedOrders,
            inProgressOrders,
            pendingOrders,
            estimatedSalary,
            avgRating,
            completionRate,
            totalOrders: completedOrders + inProgressOrders + pendingOrders
        };
    }, [attendanceData, workOrders]);

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'present': return 'bg-emerald-500';
            case 'late': return 'bg-amber-500';
            case 'leave': return 'bg-gray-300';
            case 'absent': return 'bg-red-500';
            default: return 'bg-gray-100';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const monthNames = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];

    return (
        <div className="space-y-8 pb-20 animate-fade-in admin-area">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-xl">
                            {user?.name?.charAt(0) || 'T'}
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                                Xin chào, <span className="text-[#D70018]">{user?.name || 'Kỹ thuật viên'}</span>
                            </h1>
                            <p className="text-gray-600 font-semibold flex items-center gap-2 mt-1">
                                <Briefcase size={16} />
                                Kỹ thuật viên sửa chữa
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => toast.success('Đã check-in lúc ' + new Date().toLocaleTimeString('vi-VN'))}
                        className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg"
                    >
                        <LogIn size={18} />
                        Check-in
                    </button>
                    <button
                        onClick={() => toast.success('Đã check-out lúc ' + new Date().toLocaleTimeString('vi-VN'))}
                        className="flex items-center gap-2 px-5 py-3 bg-gray-800 text-white text-sm font-bold rounded-xl hover:bg-gray-900 transition-all shadow-lg"
                    >
                        <LogOut size={18} />
                        Check-out
                    </button>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Ngày công */}
                <div className="premium-card p-6 border-2 border-gray-100 hover:border-indigo-200 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-gray-500 font-bold text-xs uppercase tracking-wider">Ngày công tháng này</p>
                            <h3 className="text-4xl font-black text-gray-900 mt-2">{stats.totalWorkDays}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                <span className="text-amber-500 font-semibold">{stats.lateDays} đi muộn</span>
                                {' · '}
                                <span className="text-gray-400">{stats.leaveDays} nghỉ phép</span>
                            </p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <CalendarDays size={28} />
                        </div>
                    </div>
                </div>

                {/* Lương ước tính */}
                <div className="premium-card p-6 border-2 border-gray-100 hover:border-emerald-200 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-gray-500 font-bold text-xs uppercase tracking-wider">Lương ước tính</p>
                            <h3 className="text-3xl font-black text-emerald-600 mt-2">{formatCurrency(stats.estimatedSalary)}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Bao gồm <span className="text-emerald-500 font-semibold">{formatCurrency(stats.completedOrders * 50000)}</span> thưởng
                            </p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <DollarSign size={28} />
                        </div>
                    </div>
                </div>

                {/* Đánh giá */}
                <div className="premium-card p-6 border-2 border-gray-100 hover:border-amber-200 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-gray-500 font-bold text-xs uppercase tracking-wider">Đánh giá trung bình</p>
                            <h3 className="text-4xl font-black text-amber-500 mt-2 flex items-center gap-2">
                                {stats.avgRating.toFixed(1)}
                                <Star size={24} fill="currentColor" />
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Từ <span className="font-semibold">{stats.completedOrders}</span> khách hàng
                            </p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Award size={28} />
                        </div>
                    </div>
                </div>

                {/* Hiệu suất */}
                <div className="premium-card p-6 border-2 border-gray-100 hover:border-blue-200 transition-all group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-gray-500 font-bold text-xs uppercase tracking-wider">Tỷ lệ hoàn thành</p>
                            <h3 className="text-4xl font-black text-blue-600 mt-2">{stats.completionRate.toFixed(0)}%</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                <span className="font-semibold">{stats.completedOrders}</span>/{stats.totalOrders} đơn
                            </p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Target size={28} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Work Orders Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Đơn cần xử lý */}
                <div className="premium-card border-2 border-amber-100 overflow-hidden">
                    <div className="bg-amber-50 px-6 py-4 flex items-center justify-between border-b border-amber-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                                <Clock size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Chờ xử lý</h3>
                                <p className="text-xs text-gray-500">{stats.pendingOrders} đơn</p>
                            </div>
                        </div>
                        <span className="text-3xl font-black text-amber-500">{stats.pendingOrders}</span>
                    </div>
                    <div className="p-4 max-h-64 overflow-y-auto">
                        {workOrders.filter(w => w.status === 'Assigned' || w.status === 'Requested').slice(0, 5).map(order => (
                            <Link
                                key={order.id}
                                to={`/backoffice/tech/work-orders/${order.id}`}
                                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-all group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">
                                    #{order.ticketNumber?.split('-')[1] || '??'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm truncate">{order.deviceModel}</p>
                                    <p className="text-xs text-gray-500 truncate">{order.description}</p>
                                </div>
                                <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                            </Link>
                        ))}
                        {stats.pendingOrders === 0 && (
                            <p className="text-center text-gray-400 py-6 text-sm">Không có đơn chờ xử lý</p>
                        )}
                    </div>
                </div>

                {/* Đang thực hiện */}
                <div className="premium-card border-2 border-blue-100 overflow-hidden">
                    <div className="bg-blue-50 px-6 py-4 flex items-center justify-between border-b border-blue-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                                <Play size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Đang xử lý</h3>
                                <p className="text-xs text-gray-500">{stats.inProgressOrders} đơn</p>
                            </div>
                        </div>
                        <span className="text-3xl font-black text-blue-500">{stats.inProgressOrders}</span>
                    </div>
                    <div className="p-4 max-h-64 overflow-y-auto">
                        {workOrders.filter(w => w.status === 'InProgress').slice(0, 5).map(order => (
                            <Link
                                key={order.id}
                                to={`/backoffice/tech/work-orders/${order.id}`}
                                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-all group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                    #{order.ticketNumber?.split('-')[1] || '??'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm truncate">{order.deviceModel}</p>
                                    <p className="text-xs text-gray-500 truncate">{order.description}</p>
                                </div>
                                <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                            </Link>
                        ))}
                        {stats.inProgressOrders === 0 && (
                            <p className="text-center text-gray-400 py-6 text-sm">Không có đơn đang xử lý</p>
                        )}
                    </div>
                </div>

                {/* Hoàn thành gần đây */}
                <div className="premium-card border-2 border-emerald-100 overflow-hidden">
                    <div className="bg-emerald-50 px-6 py-4 flex items-center justify-between border-b border-emerald-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                                <CheckCircle2 size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Hoàn thành</h3>
                                <p className="text-xs text-gray-500">Tháng này</p>
                            </div>
                        </div>
                        <span className="text-3xl font-black text-emerald-500">{stats.completedOrders}</span>
                    </div>
                    <div className="p-4 max-h-64 overflow-y-auto">
                        {workOrders.filter(w => w.status === 'Completed').slice(0, 5).map(order => (
                            <Link
                                key={order.id}
                                to={`/backoffice/tech/work-orders/${order.id}`}
                                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-all group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                    #{order.ticketNumber?.split('-')[1] || '??'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm truncate">{order.deviceModel}</p>
                                    <p className="text-xs text-gray-500 truncate">{order.description}</p>
                                </div>
                                <CheckCircle2 size={18} className="text-emerald-400" />
                            </Link>
                        ))}
                        {stats.completedOrders === 0 && (
                            <p className="text-center text-gray-400 py-6 text-sm">Chưa có đơn hoàn thành</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Attendance Calendar */}
            <div className="premium-card border-2 overflow-hidden">
                <div className="px-6 py-5 border-b flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">Bảng chấm công</h3>
                            <p className="text-sm text-gray-500">Theo dõi ngày làm việc trong tháng</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {monthNames.map((name, index) => (
                                <option key={index} value={index}>{name}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {[2024, 2025, 2026].map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="p-6">
                    {/* Legend */}
                    <div className="flex items-center gap-6 mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                            <span className="text-sm text-gray-600">Có mặt</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                            <span className="text-sm text-gray-600">Đi muộn</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-gray-300"></div>
                            <span className="text-sm text-gray-600">Nghỉ phép</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-red-500"></div>
                            <span className="text-sm text-gray-600">Vắng mặt</span>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                            <div key={day} className="text-center text-xs font-bold text-gray-500 py-2">{day}</div>
                        ))}

                        {/* Empty cells for days before the 1st */}
                        {Array.from({ length: new Date(selectedYear, selectedMonth, 1).getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square"></div>
                        ))}

                        {/* Day cells */}
                        {attendanceData.map((day) => (
                            <div
                                key={day.date}
                                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all cursor-pointer hover:scale-105 ${
                                    day.status === 'future' ? 'bg-gray-50 text-gray-300' :
                                    day.status === 'present' ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200' :
                                    day.status === 'late' ? 'bg-amber-50 text-amber-700 ring-2 ring-amber-200' :
                                    day.status === 'leave' ? 'bg-gray-100 text-gray-400' :
                                    'bg-red-50 text-red-700 ring-2 ring-red-200'
                                }`}
                                title={day.checkIn ? `Check-in: ${day.checkIn} - Check-out: ${day.checkOut}` : ''}
                            >
                                <span>{day.date}</span>
                                {day.checkIn && (
                                    <span className="text-[10px] opacity-70">{day.checkIn}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="text-sm">
                            <span className="text-gray-500">Tổng ngày công:</span>
                            <span className="font-bold text-gray-900 ml-2">{stats.totalWorkDays} ngày</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-gray-500">Đi muộn:</span>
                            <span className="font-bold text-amber-500 ml-2">{stats.lateDays} ngày</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-gray-500">Nghỉ phép:</span>
                            <span className="font-bold text-gray-500 ml-2">{stats.leaveDays} ngày</span>
                        </div>
                    </div>
                    <Link
                        to="/backoffice/tech/attendance"
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                        Xem chi tiết <ChevronRight size={16} />
                    </Link>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                    to="/backoffice/tech"
                    className="premium-card p-5 flex items-center gap-4 hover:shadow-lg transition-all group border-2 hover:border-blue-200"
                >
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ClipboardList size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Quản lý phiếu</h4>
                        <p className="text-xs text-gray-500">Xem tất cả phiếu sửa chữa</p>
                    </div>
                </Link>

                <button
                    onClick={() => toast.info('Chức năng đang phát triển')}
                    className="premium-card p-5 flex items-center gap-4 hover:shadow-lg transition-all group border-2 hover:border-purple-200 text-left"
                >
                    <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Thống kê hiệu suất</h4>
                        <p className="text-xs text-gray-500">Xem báo cáo chi tiết</p>
                    </div>
                </button>

                <button
                    onClick={() => toast.info('Chức năng đang phát triển')}
                    className="premium-card p-5 flex items-center gap-4 hover:shadow-lg transition-all group border-2 hover:border-emerald-200 text-left"
                >
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Coffee size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Xin nghỉ phép</h4>
                        <p className="text-xs text-gray-500">Đăng ký nghỉ phép</p>
                    </div>
                </button>

                <button
                    onClick={() => toast.info('Chức năng đang phát triển')}
                    className="premium-card p-5 flex items-center gap-4 hover:shadow-lg transition-all group border-2 hover:border-amber-200 text-left"
                >
                    <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Timer size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Đăng ký OT</h4>
                        <p className="text-xs text-gray-500">Làm thêm giờ</p>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default TechDashboard;
