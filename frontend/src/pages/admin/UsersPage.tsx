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
            case 'Admin': return { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' };
            case 'Manager': return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
            case 'Technician': return { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' };
            case 'Customer': return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' };
            default: return { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-100' };
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
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Quản trị <span className="text-[#D70018]">Người dùng</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        Quản lý tài khoản, phân quyền và lịch sử hoạt động
                    </p>
                </div>
                <button className="flex items-center gap-3 px-8 py-4 bg-[#D70018] hover:bg-[#b50014] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-500/20 active:scale-95 group">
                    <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
                    Thêm thành viên
                </button>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#D70018] transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên hoặc email người dùng..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-5 py-4 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-100 transition-all shadow-sm"
                    />
                </div>
                <button className="flex items-center gap-2 px-6 py-4 bg-white border border-gray-100 text-gray-400 rounded-2xl hover:text-[#D70018] hover:border-red-100 transition-all shadow-sm font-black uppercase text-[10px] tracking-widest">
                    <Filter size={18} />
                    Lọc vai trò
                </button>
            </div>

            {/* Users Table */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="premium-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#D70018]/5 text-[#D70018] text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Thành viên</th>
                                <th className="px-8 py-5">Email liên hệ</th>
                                <th className="px-8 py-5">Vai trò</th>
                                <th className="px-8 py-5 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan={4} className="px-8 py-20 text-center"><Loader2 className="mx-auto animate-spin text-[#D70018]" /></td></tr>
                            ) : filteredUsers.map((user: User) => (
                                <tr key={user.id} className="hover:bg-gray-50/50 transition-all group cursor-pointer">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center font-black text-gray-400 shadow-inner group-hover:bg-[#D70018] group-hover:text-white transition-all">
                                                {user.fullName.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-xs font-black text-gray-800 uppercase italic tracking-tight">{user.fullName}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-gray-500 font-bold text-[11px]">
                                            <Mail size={14} className="text-gray-300" />
                                            {user.email}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-wrap gap-2">
                                            {user.roles?.map(role => {
                                                const info = getRoleInfo(role);
                                                return (
                                                    <span key={role} className={`px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest italic border ${info.bg} ${info.color} ${info.border}`}>
                                                        {role}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={() => { setSelectedUser(user); setIsRoleModalOpen(true); }}
                                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#D70018] hover:bg-red-50 transition-all shadow-sm"
                                            >
                                                <Shield size={14} /> Cấp quyền
                                            </button>
                                            <button
                                                onClick={() => { if (window.confirm('Xóa?')) deleteUserMutation.mutate(user.id); }}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-red-600 transition-all shadow-sm"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Pagination UI */}
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                    Hiển thị <span className="text-gray-900">{users.length}</span> / <span className="text-gray-900">{total}</span> người dùng
                </p>
                <div className="flex gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-6 py-3 bg-gray-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#D70018] disabled:opacity-30 transition-all font-black"
                    >
                        Trang trước
                    </button>
                    <button
                        disabled={page >= Math.ceil(total / pageSize)}
                        onClick={() => setPage(p => p + 1)}
                        className="px-6 py-3 bg-gray-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#D70018] disabled:opacity-30 transition-all font-black"
                    >
                        Trang kế tiếp
                    </button>
                </div>
            </div>

            {/* Role Modal */}
            <AnimatePresence>
                {isRoleModalOpen && selectedUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRoleModalOpen(false)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-lg bg-white rounded-3xl p-8">
                            <h2 className="text-2xl font-black text-gray-900 uppercase italic mb-6">Phân quyền: <span className="text-[#D70018]">{selectedUser.fullName}</span></h2>
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                {allRoles.map(roleObj => (
                                    <button
                                        key={roleObj.id}
                                        onClick={() => handleToggleRole(roleObj.name)}
                                        className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between font-black uppercase text-[10px] tracking-widest ${selectedUser.roles?.includes(roleObj.name) ? 'border-[#D70018] bg-red-50 text-[#D70018]' : 'border-gray-50 bg-gray-50 text-gray-400'}`}
                                    >
                                        {roleObj.name}
                                        {selectedUser.roles?.includes(roleObj.name) && <Check size={16} />}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setIsRoleModalOpen(false)} className="flex-1 py-4 bg-gray-50 font-black uppercase text-[10px] rounded-2xl">Đóng</button>
                                <button
                                    onClick={() => updateRolesMutation.mutate({ id: selectedUser.id, roles: selectedUser.roles })}
                                    className="flex-[2] py-4 bg-[#D70018] text-white font-black uppercase text-[10px] rounded-2xl"
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
