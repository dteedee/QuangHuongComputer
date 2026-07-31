import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { UserPlus, Mail, Search, Edit2, Loader2, Check, Users2, Briefcase, Calendar, Power, PowerOff, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi, contractsApi, contractTypeLabels, contractStatusLabels, type Employee } from '../../../api/hr';
import toast from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { DependentsEditor } from '../../../components/hr/dependents-editor';
import { SalaryStructureHistory } from '../../../components/hr/salary-structure-history';
import { z } from 'zod';
import { validationMessages as msg } from '../../../lib/validation/messages';

type EditTab = 'info' | 'dependents' | 'contracts' | 'salary';

export const EmployeesPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [editTab, setEditTab] = useState<EditTab>('info');
    const pageSize = 15;
    const queryClient = useQueryClient();
    const confirm = useConfirm();

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
            setErrors({});
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
            setErrors({});
        },
        onError: () => toast.error('Lỗi khi cập nhật nhân viên!')
    });

    const toggleStatusMutation = useMutation({
        mutationFn: ({ id, newStatus }: { id: string; newStatus: 'Active' | 'Inactive' }) =>
            hrApi.updateEmployee(id, { status: newStatus }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success(variables.newStatus === 'Active' ? 'Đã kích hoạt nhân viên!' : 'Đã vô hiệu hóa nhân viên!');
        },
        onError: () => toast.error('Lỗi khi cập nhật trạng thái!')
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
        const data: Partial<Employee> = {
            fullName: formData.get('fullName') as string,
            email: formData.get('email') as string,
            phone: (formData.get('phone') as string) || undefined,
            department: formData.get('department') as string,
            position: formData.get('position') as string,
            baseSalary: Number(formData.get('baseSalary')),
            hireDate: formData.get('hireDate') as string,
            status: formData.get('status') as Employee['status'],
            address: (formData.get('address') as string) || undefined,
            emergencyContact: (formData.get('emergencyContact') as string) || undefined,
            taxCode: (formData.get('taxCode') as string) || undefined,
            socialInsuranceNumber: (formData.get('socialInsuranceNumber') as string) || undefined,
            idCardNumber: (formData.get('idCardNumber') as string) || undefined,
            bankAccount: (formData.get('bankAccount') as string) || undefined,
            bankName: (formData.get('bankName') as string) || undefined,
            workLocation: (formData.get('workLocation') as string) || undefined,
        };

        const schema = z.object({
            fullName: z.string().min(1, msg.requireInput('Họ và tên')),
            email: z.string().min(1, msg.requireInput('Email')).email('Email không hợp lệ'),
            department: z.string().min(1, msg.requireSelect('Phòng ban')),
            position: z.string().min(1, msg.requireInput('Vị trí')),
            baseSalary: z.number().min(1, msg.requireInput('Lương cơ bản (VND)')),
            hireDate: z.string().min(1, msg.requireInput('Ngày vào làm'))
        });

        const result = schema.safeParse(data);
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach(issue => {
                const path = issue.path[0]?.toString();
                if (path) fieldErrors[path] = issue.message;
            });
            setErrors(fieldErrors);
            return;
        }

        setErrors({});

        if (editingEmployee) {
            updateMutation.mutate({ id: editingEmployee.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const openEditModal = (employee: Employee) => {
        setEditingEmployee(employee);
        setErrors({});
        setEditTab('info');
        setIsModalOpen(true);
    };

    const openAddModal = () => {
        setEditingEmployee(null);
        setErrors({});
        setEditTab('info');
        setIsModalOpen(true);
    };

    const handleToggleStatus = async (employee: Employee) => {
        const newStatus = employee.status === 'Active' ? 'Inactive' : 'Active';
        const action = newStatus === 'Active' ? 'kích hoạt' : 'vô hiệu hóa';
        const ok = await confirm({ message: `Bạn có chắc muốn ${action} nhân viên "${employee.fullName}"?`, variant: 'warning' });
        if (ok) {
            toggleStatusMutation.mutate({ id: employee.id, newStatus });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Active':
                return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-xl text-[8px] font-medium">Đang làm việc</span>;
            case 'OnLeave':
                return <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-xl text-[8px] font-medium">Nghỉ phép</span>;
            case 'Inactive':
                return <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-xl text-[8px] font-medium">Đã nghỉ việc</span>;
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
                    <h1 className="text-2xl font-semibold text-slate-900 leading-none mb-2">
                        Quản lý <span className="text-accent">Nhân viên</span>
                    </h1>
                    <p className="text-gray-500 font-medium text-xs flex items-center gap-2">
                        Danh sách nhân viên và thông tin chi tiết
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-3 px-8 py-4 bg-accent text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-500/15 hover:bg-accent-hover transition-all active:scale-95 group"
                >
                    <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
                    Thêm nhân viên
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <motion.div whileHover={{ y: -5 }} className="premium-card p-8 group">
                    <div className="p-4 bg-blue-50 text-blue-500 rounded-xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform">
                        <Users2 size={22} />
                    </div>
                    <p className="text-gray-400 text-xs text-slate-500 mb-1">Tổng nhân sự</p>
                    <h3 className="text-xl font-semibold text-slate-900">{total}</h3>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="premium-card p-8 group">
                    <div className="p-4 bg-emerald-50 text-emerald-500 rounded-xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform">
                        <Briefcase size={22} />
                    </div>
                    <p className="text-gray-400 text-xs text-slate-500 mb-1">Đang làm việc</p>
                    <h3 className="text-xl font-semibold text-slate-900">
                        {employees.filter((e: Employee) => e.status === 'Active').length}
                    </h3>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="premium-card p-8 group">
                    <div className="p-4 bg-amber-50 text-amber-500 rounded-xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform">
                        <Calendar size={22} />
                    </div>
                    <p className="text-gray-400 text-xs text-slate-500 mb-1">Nghỉ phép</p>
                    <h3 className="text-xl font-semibold text-slate-900">
                        {employees.filter((e: Employee) => e.status === 'OnLeave').length}
                    </h3>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="premium-card p-8 group">
                    <div className="p-4 bg-gray-50 text-gray-400 rounded-xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform">
                        <Users2 size={22} />
                    </div>
                    <p className="text-gray-400 text-xs text-slate-500 mb-1">Đã nghỉ việc</p>
                    <h3 className="text-xl font-semibold text-slate-900">
                        {employees.filter((e: Employee) => e.status === 'Inactive').length}
                    </h3>
                </motion.div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-accent transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên hoặc email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-5 py-4 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-blue-200 transition-all shadow-sm"
                    />
                </div>
                <SearchableSelect
                    value={departmentFilter}
                    onChange={(val: string) => { setDepartmentFilter(val); setPage(1); }}
                    placeholder="Tất cả phòng ban"
                    options={[
                        { value: '', label: 'Tất cả phòng ban' },
                        ...departments.map((dept) => ({ value: dept, label: dept })),
                    ]}
                />
                <SearchableSelect
                    value={statusFilter}
                    onChange={(val: string) => { setStatusFilter(val); setPage(1); }}
                    placeholder="Tất cả trạng thái"
                    options={[
                        { value: '', label: 'Tất cả trạng thái' },
                        { value: 'Active', label: 'Đang làm việc' },
                        { value: 'OnLeave', label: 'Nghỉ phép' },
                        { value: 'Inactive', label: 'Đã nghỉ việc' },
                    ]}
                />
                {(departmentFilter || statusFilter) && (
                    <button
                        onClick={() => { setDepartmentFilter(''); setStatusFilter(''); }}
                        className="px-6 py-4 bg-gray-50 text-gray-400 rounded-xl hover:bg-blue-50 hover:text-accent transition-all font-semibold text-xs"
                    >
                        Xóa bộ lọc
                    </button>
                )}
            </div>

            {/* Employees Table */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="premium-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-accent/5 text-accent text-xs text-slate-500">
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
                                        <Loader2 className="mx-auto animate-spin text-accent" />
                                    </td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-20 text-center">
                                        <Users2 className="mx-auto text-gray-100 mb-4" size={60} />
                                        <p className="text-xs text-gray-300 font-semibold">
                                            Không tìm thấy nhân viên
                                        </p>
                                    </td>
                                </tr>
                            ) : filteredEmployees.map((employee: Employee) => (
                                <tr key={employee.id} className="hover:bg-gray-50/50 transition-all group cursor-pointer">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center font-semibold text-gray-400 shadow-inner group-hover:bg-accent group-hover:text-white transition-all">
                                                {employee.fullName.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-xs font-semibold text-gray-800  tracking-tight">
                                                {employee.fullName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-gray-500 font-bold text-xs">
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
                                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-[9px] font-medium text-accent hover:bg-blue-50 transition-all shadow-sm"
                                            >
                                                <Edit2 size={14} /> Sửa
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(employee)}
                                                className={`w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 transition-all shadow-sm ${
                                                    employee.status === 'Active'
                                                        ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
                                                        : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'
                                                }`}
                                                title={employee.status === 'Active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                            >
                                                {employee.status === 'Active' ? <PowerOff size={16} /> : <Power size={16} />}
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
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-slate-400">
                    Hiển thị <span className="text-gray-900">{filteredEmployees.length}</span> / <span className="text-gray-900">{total}</span> nhân viên
                </p>
                <div className="flex gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-6 py-3 bg-gray-50 border border-transparent rounded-xl text-xs text-slate-500 text-gray-400 hover:text-accent disabled:opacity-30 transition-all"
                    >
                        Trang trước
                    </button>
                    <button
                        disabled={page >= Math.ceil(total / pageSize)}
                        onClick={() => setPage(p => p + 1)}
                        className="px-6 py-3 bg-gray-50 border border-transparent rounded-xl text-xs text-slate-500 text-gray-400 hover:text-accent disabled:opacity-30 transition-all"
                    >
                        Trang kế tiếp
                    </button>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`${editingEmployee ? 'Chỉnh sửa' : 'Thêm'} Nhân viên`}
                description="Nhập thông tin chi tiết nhân viên vào hệ thống"
            >
                {editingEmployee && (
                    <div className="flex gap-1 mb-6 border-b border-gray-100">
                        {(['info', 'dependents', 'contracts', 'salary'] as EditTab[]).map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setEditTab(t)}
                                className={`px-4 py-2 text-xs font-semibold transition-colors ${editTab === t ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {tabLabel(t)}
                            </button>
                        ))}
                    </div>
                )}

                {editingEmployee && editTab === 'dependents' && (
                    <DependentsEditor employeeId={editingEmployee.id} />
                )}
                {editingEmployee && editTab === 'contracts' && (
                    <EmployeeContractsMini employeeId={editingEmployee.id} />
                )}
                {editingEmployee && editTab === 'salary' && (
                    <SalaryStructureHistory employeeId={editingEmployee.id} />
                )}

                {(!editingEmployee || editTab === 'info') && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <Input
                                label="Họ và tên *"
                                name="fullName"
                                defaultValue={editingEmployee?.fullName}
                            />
                            {errors.fullName && <p className="text-red-500 text-xs font-medium mt-1">{errors.fullName}</p>}
                        </div>
                        <div className="flex flex-col">
                            <Input
                                label="Email *"
                                name="email"
                                type="email"
                                defaultValue={editingEmployee?.email}
                            />
                            {errors.email && <p className="text-red-500 text-xs font-medium mt-1">{errors.email}</p>}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <Input
                                label="Số điện thoại"
                                name="phone"
                                defaultValue={editingEmployee?.phone}
                            />
                        </div>
                        <div className="flex flex-col">
                            <Select
                                label="Phòng ban *"
                                name="department"
                                defaultValue={editingEmployee?.department || ''}
                                options={[
                                    { label: 'Chọn phòng ban', value: '' },
                                    ...departments.map(dept => ({ label: dept, value: dept }))
                                ]}
                            />
                            {errors.department && <p className="text-red-500 text-xs font-medium mt-1">{errors.department}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <Input
                                label="Vị trí *"
                                name="position"
                                defaultValue={editingEmployee?.position}
                            />
                            {errors.position && <p className="text-red-500 text-xs font-medium mt-1">{errors.position}</p>}
                        </div>
                        <div className="flex flex-col">
                            <Input
                                label="Lương cơ bản (VND) *"
                                name="baseSalary"
                                type="number"
                                defaultValue={editingEmployee?.baseSalary || 10000000}
                            />
                            {errors.baseSalary && <p className="text-red-500 text-xs font-medium mt-1">{errors.baseSalary}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <Input
                                label="Ngày vào làm *"
                                name="hireDate"
                                type="date"
                                defaultValue={editingEmployee?.hireDate?.split('T')[0]}
                            />
                            {errors.hireDate && <p className="text-red-500 text-xs font-medium mt-1">{errors.hireDate}</p>}
                        </div>
                        <div className="flex flex-col">
                            <Select
                                label="Trạng thái *"
                                name="status"
                                defaultValue={editingEmployee?.status || 'Active'}
                                options={[
                                    { label: 'Đang làm việc', value: 'Active' },
                                    { label: 'Nghỉ phép', value: 'OnLeave' },
                                    { label: 'Đã nghỉ việc', value: 'Inactive' }
                                ]}
                            />
                        </div>
                    </div>

                    <Input
                        label="Địa chỉ"
                        name="address"
                        defaultValue={editingEmployee?.address}
                    />

                    <Input
                        label="Liên hệ khẩn cấp"
                        name="emergencyContact"
                        defaultValue={editingEmployee?.emergencyContact}
                    />

                    {/* Additional fields — Phase 06 */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Mã số thuế cá nhân" name="taxCode" defaultValue={editingEmployee?.taxCode} />
                        <Input label="Số sổ BHXH" name="socialInsuranceNumber" defaultValue={editingEmployee?.socialInsuranceNumber} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="CMND/CCCD" name="idCardNumber" defaultValue={editingEmployee?.idCardNumber} />
                        <Input label="Chi nhánh làm việc" name="workLocation" defaultValue={editingEmployee?.workLocation} placeholder="Store ID hoặc tên..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Số tài khoản ngân hàng" name="bankAccount" defaultValue={editingEmployee?.bankAccount} />
                        <Input label="Tên ngân hàng" name="bankName" defaultValue={editingEmployee?.bankName} />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 uppercase text-xs"
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            loading={createMutation.isPending || updateMutation.isPending}
                            icon={Check}
                            className="flex-[2] uppercase text-xs"
                        >
                            {editingEmployee ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                    </div>
                </form>
                )}
            </Modal>
        </div>
    );
};

function tabLabel(t: EditTab): string {
    switch (t) {
        case 'info': return 'Thông tin';
        case 'dependents': return 'Người phụ thuộc';
        case 'contracts': return 'Hợp đồng';
        case 'salary': return 'Cơ cấu lương';
    }
}

// Mini list of contracts for the employee, embedded in the edit modal.
function EmployeeContractsMini({ employeeId }: { employeeId: string }) {
    const { data: contracts = [], isLoading } = useQuery({
        queryKey: ['employee-contracts', employeeId],
        queryFn: () => contractsApi.list({ employeeId }),
    });
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Hợp đồng của nhân viên</h3>
                <Link to="/backoffice/hr/contracts" className="text-xs text-accent hover:underline flex items-center gap-1">
                    <FileText size={12} />Xem tất cả
                </Link>
            </div>
            {isLoading ? (
                <p className="text-xs text-gray-400">Đang tải...</p>
            ) : contracts.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-4 text-center border border-dashed border-gray-200 rounded-lg">
                    Nhân viên chưa có HĐ nào
                </p>
            ) : (
                <ul className="space-y-2">
                    {contracts.map(c => (
                        <li key={c.id} className="premium-card p-3 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-mono">{c.contractNumber}</p>
                                <p className="text-[11px] text-gray-500">
                                    {contractTypeLabels[c.type]} · {new Date(c.startDate).toLocaleDateString('vi-VN')}
                                    {c.endDate ? ` – ${new Date(c.endDate).toLocaleDateString('vi-VN')}` : ' (KXĐ)'}
                                </p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                                {contractStatusLabels[c.status]}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
