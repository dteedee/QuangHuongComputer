import { useState, useEffect } from 'react';
import { authApi } from '../../api/auth';
import { Shield, Plus, Trash2, Save, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export const RolesPage = () => {
    const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [selectedRole, setSelectedRole] = useState<{ id: string; name: string } | null>(null);
    const [rolePermissions, setRolePermissions] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');

    useEffect(() => {
        loadRoles();
        loadAllPermissions();
    }, []);

    useEffect(() => {
        if (selectedRole) {
            loadRolePermissions(selectedRole.id);
        } else {
            setRolePermissions([]);
        }
    }, [selectedRole]);

    const loadRoles = async () => {
        try {
            const data = await authApi.getRoles();
            setRoles(data);
        } catch (error) {
            console.error(error);
        }
    };

    const loadAllPermissions = async () => {
        try {
            const data = await authApi.getAllPermissions();
            setPermissions(data);
        } catch (error) {
            console.error(error);
        }
    };

    const loadRolePermissions = async (roleId: string) => {
        try {
            const data = await authApi.getRolePermissions(roleId);
            setRolePermissions(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName) return;
        try {
            await authApi.createRole(newRoleName);
            toast.success('Đã tạo vai trò mới!');
            setNewRoleName('');
            loadRoles();
        } catch (error) {
            toast.error('Lỗi khi tạo vai trò');
        }
    };

    const savePermissions = async () => {
        if (!selectedRole) return;
        setIsSaving(true);
        try {
            await authApi.updateRolePermissions(selectedRole.id, rolePermissions);
            toast.success('Cập nhật quyền thành công!');
        } catch (error) {
            toast.error('Lỗi khi lưu quyền');
        } finally {
            setIsSaving(false);
        }
    };

    const togglePermission = (perm: string) => {
        setRolePermissions(prev =>
            prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
        );
    };

    const groupedPermissions = permissions.reduce((acc, perm) => {
        const category = perm.split('.')[1] || 'Hệ thống';
        if (!acc[category]) acc[category] = [];
        acc[category].push(perm);
        return acc;
    }, {} as Record<string, string[]>);

    return (
        <div className="space-y-10 pb-20 animate-fade-in admin-area">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-3">
                        Quản lý <span className="text-[#D70018]">Quyền hạn</span>
                    </h1>
                    <p className="text-gray-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                        Cấu hình các nhóm quyền hạn và vai trò người dùng
                    </p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Roles List */}
                <div className="lg:w-1/3">
                    <div className="premium-card p-8 border-2 bg-white sticky top-10">
                        <h2 className="text-xl font-black text-gray-950 uppercase italic tracking-widest mb-6 border-b-2 border-red-50 pb-2">Danh sách vai trò</h2>

                        <form onSubmit={handleCreateRole} className="flex gap-3 mb-8">
                            <input
                                type="text"
                                value={newRoleName}
                                onChange={e => setNewRoleName(e.target.value)}
                                placeholder="Tên vai trò mới..."
                                className="flex-1 px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-950 focus:outline-none focus:border-[#D70018] shadow-sm transition-all"
                            />
                            <button className="p-4 bg-gray-950 text-white rounded-2xl hover:bg-black shadow-lg shadow-gray-900/20 active:scale-95 transition-all">
                                <Plus size={24} />
                            </button>
                        </form>

                        <div className="space-y-3">
                            {roles.map(role => (
                                <div
                                    key={role.id}
                                    onClick={() => setSelectedRole(role)}
                                    className={`p-5 rounded-2xl cursor-pointer transition-all flex justify-between items-center group ${selectedRole?.id === role.id
                                        ? 'bg-gray-950 text-white shadow-xl shadow-gray-900/30 -translate-x-2'
                                        : 'bg-white border-2 border-gray-50 text-gray-700 hover:border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="font-black uppercase tracking-tight text-sm italic">{role.name}</span>
                                    {role.name !== 'Admin' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm('Xóa vai trò này?')) authApi.deleteRole(role.name).then(loadRoles);
                                            }}
                                            className={`transition-all ${selectedRole?.id === role.id ? 'text-white/50 hover:text-white' : 'text-gray-300 hover:text-red-500'}`}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Permissions Matrix */}
                <div className="lg:w-2/3">
                    {selectedRole ? (
                        <div className="premium-card p-10 border-2 bg-white">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-6 border-b-2 border-gray-50">
                                <div>
                                    <h2 className="text-3xl font-black text-gray-950 uppercase italic tracking-tighter">
                                        QUYỀN HẠN: <span className="text-[#D70018]">{selectedRole.name}</span>
                                    </h2>
                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest mt-1 italic">Tích chọn các hành động được phép thực hiện</p>
                                </div>
                                <button
                                    onClick={savePermissions}
                                    disabled={isSaving}
                                    className="flex items-center gap-3 px-8 py-5 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-gray-900/20 disabled:opacity-50 active:scale-95"
                                >
                                    <Save size={20} />
                                    {isSaving ? 'Đang lưu...' : 'Lưu quyền hạn'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[700px] overflow-y-auto pr-4 custom-scrollbar">
                                {Object.entries(groupedPermissions).map(([category, perms]) => (
                                    <div key={category} className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-100">
                                        <h3 className="text-lg font-black text-[#D70018] uppercase italic tracking-widest mb-6 border-b-2 border-red-100 pb-2">{category}</h3>
                                        <div className="space-y-4">
                                            {perms.map(perm => (
                                                <label key={perm} className="flex items-center gap-4 cursor-pointer group">
                                                    <div
                                                        onClick={() => togglePermission(perm)}
                                                        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${rolePermissions.includes(perm)
                                                            ? 'bg-gray-900 border-gray-900 text-white shadow-md'
                                                            : 'bg-white border-gray-200 group-hover:border-gray-400'
                                                            }`}
                                                    >
                                                        {rolePermissions.includes(perm) && <Check size={18} strokeWidth={4} />}
                                                    </div>
                                                    <span className={`text-sm font-black uppercase tracking-tight transition-all ${rolePermissions.includes(perm) ? 'text-gray-950' : 'text-gray-400 group-hover:text-gray-600'
                                                        }`}>
                                                        {perm.split('.').slice(2).join(' ')}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[600px] flex flex-col items-center justify-center premium-card border-2 border-dashed border-gray-200 bg-gray-50/30">
                            <div className="w-24 h-24 rounded-3xl bg-white border-2 border-gray-100 flex items-center justify-center mb-6 shadow-sm">
                                <Shield size={48} className="text-gray-200" />
                            </div>
                            <p className="text-xl font-black text-gray-400 uppercase italic tracking-tighter">Chọn một vai trò để bắt đầu cấu hình</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
