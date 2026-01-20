import { useState } from 'react';
import { UserPlus, Mail, Phone, Search, Filter, Edit2, Trash2, Loader2, X, Check, Users2, Briefcase, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi, type Employee } from '../../../api/hr';
import toast from 'react-hot-toast';

export const EmployeesPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const pageSize = 15;
    const queryClient = useQueryClient();

    const { data: response, isLoading } = useQuery({
        queryKey: ['employees', page, departmentFilter, statusFilter],
        queryFn: () => hrApi.getEmployees(page, pageSize, {
            department: departmentFilter,
            status: statusFilter
        }),
    });

    const createMutation = useMutation({
        mutationFn: (data: Partial<Employee>) => hrApi.createEmployee(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Thêm nhân viên thành công!');
            setIsModalOpen(false);
            setEditingEmployee(null);
        },
        onError: () => toast.error('Lỗi khi thêm nhân viên!')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) =>
            hrApi.updateEmployee(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Cập nhật nhân viên thành công!');
            setIsModalOpen(false);
            setEditingEmployee(null);
        },
        onError: () => toast.error('Lỗi khi cập nhật nhân viên!')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => hrApi.deleteEmployee(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Xóa nhân viên thành công!');
        },
        onError: () => toast.error('Lỗi khi xóa nhân viên!')
    });

    const employees = response?.items || [];
    const total = response?.total || 0;

    const filteredEmployees = employees.filter((emp: Employee) =>
        (emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            fullName: formData.get('fullName') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            department: formData.get('department') as string,
            position: formData.get('position') as string,
            baseSalary: Number(formData.get('baseSalary')),
            hireDate: formData.get('hireDate') as string,
            status: formData.get('status') as 'Active' | 'Inactive' | 'OnLeave',
            address: formData.get('address') as string,
            emergencyContact: formData.get('emergencyContact') as string,
        };

        if (editingEmployee) {
            updateMutation.mutate({ id: editingEmployee.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const openEditModal = (employee: Employee) => {
        setEditingEmployee(employee);
        setIsModalOpen(true);
    };

    const openAddModal = () => {
        setEditingEmployee(null);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Bạn có chắc muốn xóa nhân viên này?')) {
            deleteMutation.mutate(id);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Active':
                return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-xl text-[8px] font-black uppercase tracking-widest">Đang làm việc</span>;
            case 'OnLeave':
                return <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-xl text-[8px] font-black uppercase tracking-widest">Nghỉ phép</span>;
            case 'Inactive':
                return <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-xl text-[8px] font-black uppercase tracking-widest">Đã nghỉ việc</span>;
            default:
                return null;
        }
    };

    const departments = ['IT', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'];

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Quản lý <span className="text-[#D70018]">Nhân viên</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        Danh sách nhân viên và thông tin chi tiết
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-3 px-8 py-4 bg-[#D70018] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-[#b50014] transition-all active:scale-95 group"
                >
                    <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
                    Thêm nhân viên
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <motion.div whileHover={{ y: -5 }} className="premium-card p-8 group">
                    <div className="p-4 bg-blue-50 text-blue-500 rounded-2xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform">
                        <Users2 size={22} />
                    </div>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Tổng nhân sự</p>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{total}</h3>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="premium-card p-8 group">
                    <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform">
                        <Briefcase size={22} />
                    </div>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Đang làm việc</p>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter">
                        {employees.filter((e: Employee) => e.status === 'Active').length}
                    </h3>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="premium-card p-8 group">
                    <div className="p-4 bg-amber-50 text-amber-500 rounded-2xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform">
                        <Calendar size={22} />
                    </div>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Nghỉ phép</p>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter">
                        {employees.filter((e: Employee) => e.status === 'OnLeave').length}
                    </h3>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="premium-card p-8 group">
                    <div className="p-4 bg-gray-50 text-gray-400 rounded-2xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform">
                        <Users2 size={22} />
                    </div>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Đã nghỉ việc</p>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter">
                        {employees.filter((e: Employee) => e.status === 'Inactive').length}
                    </h3>
                </motion.div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#D70018] transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên hoặc email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-5 py-4 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-100 transition-all shadow-sm"
                    />
                </div>
                <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-6 py-4 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-100 transition-all shadow-sm"
                >
                    <option value="">Tất cả phòng ban</option>
                    {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-6 py-4 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-100 transition-all shadow-sm"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="Active">Đang làm việc</option>
                    <option value="OnLeave">Nghỉ phép</option>
                    <option value="Inactive">Đã nghỉ việc</option>
                </select>
                {(departmentFilter || statusFilter) && (
                    <button
                        onClick={() => { setDepartmentFilter(''); setStatusFilter(''); }}
                        className="px-6 py-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-red-50 hover:text-[#D70018] transition-all font-black uppercase text-[10px] tracking-widest"
                    >
                        Xóa bộ lọc
                    </button>
                )}
            </div>

            {/* Employees Table */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="premium-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#D70018]/5 text-[#D70018] text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Nhân viên</th>
                                <th className="px-8 py-5">Email</th>
                                <th className="px-8 py-5">Phòng ban</th>
                                <th className="px-8 py-5">Vị trí</th>
                                <th className="px-8 py-5">Ngày vào làm</th>
                                <th className="px-8 py-5">Trạng thái</th>
                                <th className="px-8 py-5 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-20 text-center">
                                        <Loader2 className="mx-auto animate-spin text-[#D70018]" />
                                    </td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-20 text-center">
                                        <Users2 className="mx-auto text-gray-100 mb-4" size={60} />
                                        <p className="text-[11px] text-gray-300 font-black uppercase italic tracking-widest">
                                            Không tìm thấy nhân viên
                                        </p>
                                    </td>
                                </tr>
                            ) : filteredEmployees.map((employee: Employee) => (
                                <tr key={employee.id} className="hover:bg-gray-50/50 transition-all group cursor-pointer">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center font-black text-gray-400 shadow-inner group-hover:bg-[#D70018] group-hover:text-white transition-all">
                                                {employee.fullName.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-xs font-black text-gray-800 uppercase italic tracking-tight">
                                                {employee.fullName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-gray-500 font-bold text-[11px]">
                                            <Mail size={14} className="text-gray-300" />
                                            {employee.email}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-xs font-bold text-gray-600">
                                            {employee.department}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-xs font-bold text-gray-600">
                                            {employee.position}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-xs font-bold text-gray-600">
                                            {new Date(employee.hireDate).toLocaleDateString('vi-VN')}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        {getStatusBadge(employee.status)}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={() => openEditModal(employee)}
                                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#D70018] hover:bg-red-50 transition-all shadow-sm"
                                            >
                                                <Edit2 size={14} /> Sửa
                                            </button>
                                            <button
                                                onClick={() => handleDelete(employee.id)}
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

            {/* Pagination */}
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                    Hiển thị <span className="text-gray-900">{filteredEmployees.length}</span> / <span className="text-gray-900">{total}</span> nhân viên
                </p>
                <div className="flex gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-6 py-3 bg-gray-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#D70018] disabled:opacity-30 transition-all"
                    >
                        Trang trước
                    </button>
                    <button
                        disabled={page >= Math.ceil(total / pageSize)}
                        onClick={() => setPage(p => p + 1)}
                        className="px-6 py-3 bg-gray-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#D70018] disabled:opacity-30 transition-all"
                    >
                        Trang kế tiếp
                    </button>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
                        >
                            <h2 className="text-2xl font-black text-gray-900 uppercase italic mb-6 tracking-tighter">
                                {editingEmployee ? 'Chỉnh sửa' : 'Thêm'} <span className="text-[#D70018]">Nhân viên</span>
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Họ và tên <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            name="fullName"
                                            required
                                            defaultValue={editingEmployee?.fullName}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-500/5"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Email <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            name="email"
                                            type="email"
                                            required
                                            defaultValue={editingEmployee?.email}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-500/5"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Số điện thoại
                                        </label>
                                        <input
                                            name="phone"
                                            defaultValue={editingEmployee?.phone}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-500/5"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Phòng ban <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="department"
                                            required
                                            defaultValue={editingEmployee?.department}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-500/5"
                                        >
                                            <option value="">Chọn phòng ban</option>
                                            {departments.map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Vị trí <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            name="position"
                                            required
                                            defaultValue={editingEmployee?.position}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-500/5"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Lương cơ bản (₫) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            name="baseSalary"
                                            type="number"
                                            required
                                            defaultValue={editingEmployee?.baseSalary || 10000000}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-500/5"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Ngày vào làm <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            name="hireDate"
                                            type="date"
                                            required
                                            defaultValue={editingEmployee?.hireDate?.split('T')[0]}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-500/5"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Trạng thái <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="status"
                                            required
                                            defaultValue={editingEmployee?.status || 'Active'}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-500/5"
                                        >
                                            <option value="Active">Đang làm việc</option>
                                            <option value="OnLeave">Nghỉ phép</option>
                                            <option value="Inactive">Đã nghỉ việc</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        Địa chỉ
                                    </label>
                                    <input
                                        name="address"
                                        defaultValue={editingEmployee?.address}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-500/5"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        Liên hệ khẩn cấp
                                    </label>
                                    <input
                                        name="emergencyContact"
                                        defaultValue={editingEmployee?.emergencyContact}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-red-500/5"
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-4 bg-gray-50 text-gray-400 font-black uppercase text-[10px] rounded-2xl hover:bg-gray-100 transition-all"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createMutation.isPending || updateMutation.isPending}
                                        className="flex-[2] py-4 bg-[#D70018] text-white font-black uppercase text-[10px] rounded-2xl shadow-xl shadow-red-500/20 hover:bg-[#b50014] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {(createMutation.isPending || updateMutation.isPending) ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Check size={16} />
                                        )}
                                        {editingEmployee ? 'Cập nhật' : 'Thêm mới'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
