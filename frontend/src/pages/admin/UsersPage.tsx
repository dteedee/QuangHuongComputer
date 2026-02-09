import { useState } from 'react';
import { UserPlus, Mail, Shield, Search, MoreHorizontal, Filter, X, Check, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, type User } from '../../api/auth';
import toast from 'react-hot-toast';

export const AdminUsersPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [page, setPage] = useState(1);
    const pageSize = 15;
    const queryClient = useQueryClient();

    const { data: response, isLoading } = useQuery({
        queryKey: ['admin-users', page],
        queryFn: () => authApi.getUsers(page, pageSize),
    });

    const { data: allRoles = [] } = useQuery({
        queryKey: ['available-roles'],
        queryFn: authApi.getRoles,
    });

    const updateRolesMutation = useMutation({
        mutationFn: ({ id, roles }: { id: string, roles: string[] }) => authApi.updateUserRoles(id, roles),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success('Cập nhật quyền thành công!');
            setIsRoleModalOpen(false);
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: (id: string) => authApi.deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success('Đã xóa người dùng!');
        }
    });

    const getRoleInfo = (role: string) => {
        switch (role) {
            case 'Admin': return { color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' };
            case 'Manager': return { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
            case 'Technician': return { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' };
            case 'Customer': return { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
            default: return { color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' };
        }
    };

    const users = response?.items || [];
    const total = response?.total || 0;

    const filteredUsers = users.filter((u: User) =>
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggleRole = (role: string) => {
        if (!selectedUser) return;
        const currentRoles = selectedUser.roles || [];
        const newRoles = currentRoles.includes(role)
            ? currentRoles.filter(r => r !== role)
            : [...currentRoles, role];
        setSelectedUser({ ...selectedUser, roles: newRoles });
    };

    return (
        <div className="space-y-10 pb-20 animate-fade-in admin-area">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-3">
                        Quản trị <span className="text-[#D70018]">Người dùng</span>
                    </h1>
                    <p className="text-gray-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                        Quản lý tài khoản, phân quyền và lịch sử hoạt động
                    </p>
                </div>
                <button className="flex items-center gap-3 px-8 py-4 bg-[#D70018] hover:bg-[#b50014] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-500/20 active:scale-95 group">
                    <UserPlus size={20} className="group-hover:scale-110 transition-transform" />
                    Thêm thành viên
                </button>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative flex-1 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#D70018] transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên hoặc email người dùng..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:border-[#D70018] transition-all shadow-sm placeholder:text-gray-400"
                    />
                </div>
                <button className="flex items-center gap-3 px-8 py-5 bg-white border-2 border-gray-100 text-gray-950 rounded-2xl hover:border-[#D70018] transition-all shadow-sm font-black uppercase text-xs tracking-widest">
                    <Filter size={18} />
                    Lọc vai trò
                </button>
            </div>

            {/* Users Table */}
            <div className="premium-card overflow-hidden border-2">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900 text-white text-xs font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Thành viên</th>
                                <th className="px-8 py-5">Email liên hệ</th>
                                <th className="px-8 py-5">Vai trò</th>
                                <th className="px-8 py-5 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-24 text-center">
                                        <Loader2 className="mx-auto animate-spin text-[#D70018]" size={48} />
                                        <p className="text-sm text-gray-900 font-black uppercase tracking-widest mt-4">Đang tải danh sách thành viên...</p>
                                    </td>
                                </tr>
                            ) : filteredUsers.map((user: User) => (
                                <tr key={user.id} className="hover:bg-gray-50/80 transition-all group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gray-950 text-white flex items-center justify-center font-black text-sm shadow-lg group-hover:scale-110 transition-transform">
                                                {user.fullName.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-base font-black text-gray-950 uppercase italic tracking-tight">{user.fullName}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-gray-700 font-bold text-sm">
                                            <Mail size={16} className="text-[#D70018]" />
                                            {user.email}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-wrap gap-2">
                                            {user.roles?.map(role => {
                                                const info = getRoleInfo(role);
                                                return (
                                                    <span key={role} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest italic border shadow-sm ${info.bg} ${info.color} ${info.border}`}>
                                                        {role}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            <button
                                                onClick={() => { setSelectedUser(user); setIsRoleModalOpen(true); }}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#D70018] hover:border-red-100 hover:bg-red-50 transition-all shadow-sm active:scale-95"
                                            >
                                                <Shield size={14} /> Cấp quyền
                                            </button>
                                            <button
                                                onClick={() => { if (window.confirm('Xác nhận xóa người dùng?')) deleteUserMutation.mutate(user.id); }}
                                                className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border-2 border-gray-100 text-gray-400 hover:text-red-600 hover:border-red-100 transition-all shadow-sm active:scale-95"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination UI */}
            <div className="flex justify-between items-center premium-card p-6 border-2">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest italic">
                    Hiển thị <span className="text-gray-950 underline">{users.length}</span> / <span className="text-gray-950">{total}</span> người dùng hệ thống
                </p>
                <div className="flex gap-4">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-8 py-3 bg-white border-2 border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-[#D70018] hover:border-red-100 disabled:opacity-30 transition-all shadow-sm"
                    >
                        Trang trước
                    </button>
                    <button
                        disabled={page >= Math.ceil(total / pageSize)}
                        onClick={() => setPage(p => p + 1)}
                        className="px-8 py-3 bg-white border-2 border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest text-gray-950 hover:text-white hover:bg-gray-950 transition-all shadow-sm"
                    >
                        Trang kế tiếp
                    </button>
                </div>
            </div>

            {/* Role Modal */}
            <AnimatePresence>
                {isRoleModalOpen && selectedUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRoleModalOpen(false)} className="absolute inset-0 bg-gray-950/80 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} className="relative w-full max-w-lg bg-white rounded-[2rem] p-10 shadow-2xl border-4 border-gray-100">
                            <h2 className="text-3xl font-black text-gray-950 uppercase italic tracking-tighter mb-8">Phân quyền: <span className="text-[#D70018]">{selectedUser.fullName}</span></h2>
                            <div className="grid grid-cols-2 gap-5 mb-10">
                                {allRoles.map(roleObj => (
                                    <button
                                        key={roleObj.id}
                                        onClick={() => handleToggleRole(roleObj.name)}
                                        className={`p-5 rounded-[1.5rem] border-4 transition-all flex items-center justify-between font-black uppercase text-xs tracking-widest shadow-sm active:scale-95 ${selectedUser.roles?.includes(roleObj.name) ? 'border-[#D70018] bg-red-50 text-[#D70018]' : 'border-gray-50 bg-gray-50 text-gray-400'}`}
                                    >
                                        {roleObj.name}
                                        {selectedUser.roles?.includes(roleObj.name) && <Check size={20} strokeWidth={4} />}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-6">
                                <button onClick={() => setIsRoleModalOpen(false)} className="flex-1 py-5 bg-gray-100 text-gray-500 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-gray-200 transition-all font-sans">Đóng</button>
                                <button
                                    onClick={() => updateRolesMutation.mutate({ id: selectedUser.id, roles: selectedUser.roles })}
                                    className="flex-[2] py-5 bg-[#D70018] text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-[#b50014] transition-all active:scale-95"
                                >
                                    Lưu thay đổi
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
