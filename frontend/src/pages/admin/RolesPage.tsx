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
        try {
            await authApi.createRole(newRoleName);
            toast.success('Role created successfully');
            setNewRoleName('');
            loadRoles();
        } catch (error) {
            toast.error('Failed to create role');
        }
    };

    const savePermissions = async () => {
        if (!selectedRole) return;
        setIsSaving(true);
        try {
            await authApi.updateRolePermissions(selectedRole.id, rolePermissions);
            toast.success('Permissions updated successfully');
        } catch (error) {
            toast.error('Failed to update permissions');
        } finally {
            setIsSaving(false);
        }
    };

    const togglePermission = (perm: string) => {
        setRolePermissions(prev =>
            prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
        );
    };

    // Group permissions by category (prefix)
    const groupedPermissions = permissions.reduce((acc, perm) => {
        const category = perm.split('.')[1] || 'Other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(perm);
        return acc;
    }, {} as Record<string, string[]>);

    return (
        <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                <Shield className="text-blue-500" />
                Role & Permission Management
            </h1>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Roles List */}
                <div className="lg:w-1/3 space-y-6">
                    <div className="glass p-6 rounded-2xl border-white/5">
                        <h2 className="text-xl font-bold text-white mb-4">Roles</h2>

                        <form onSubmit={handleCreateRole} className="flex gap-2 mb-6">
                            <input
                                type="text"
                                value={newRoleName}
                                onChange={e => setNewRoleName(e.target.value)}
                                placeholder="New Role Name"
                                className="flex-1 bg-slate-800 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500"
                            />
                            <button className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500">
                                <Plus size={20} />
                            </button>
                        </form>

                        <div className="space-y-2">
                            {roles.map(role => (
                                <div
                                    key={role.id}
                                    onClick={() => setSelectedRole(role)}
                                    className={`p-4 rounded-xl cursor-pointer transition flex justify-between items-center ${selectedRole?.id === role.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                        }`}
                                >
                                    <span className="font-bold">{role.name}</span>
                                    {/* Don't allow deleting Admin/Manager/Customer if you want safety, but for now allow all except maybe Admin */}
                                    {role.name !== 'Admin' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Delete role?')) authApi.deleteRole(role.name).then(loadRoles);
                                            }}
                                            className="text-white/50 hover:text-white"
                                        >
                                            <Trash2 size={16} />
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
                        <div className="glass p-8 rounded-2xl border-white/5">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">Permissions for {selectedRole.name}</h2>
                                    <p className="text-slate-500">Manage what this role can access.</p>
                                </div>
                                <button
                                    onClick={savePermissions}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    <Save size={20} />
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {Object.entries(groupedPermissions).map(([category, perms]) => (
                                    <div key={category} className="bg-white/5 p-5 rounded-xl border border-white/5">
                                        <h3 className="text-lg font-bold text-blue-400 mb-4 border-b border-white/10 pb-2">{category}</h3>
                                        <div className="space-y-3">
                                            {perms.map(perm => (
                                                <label key={perm} className="flex items-center gap-3 cursor-pointer group">
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${rolePermissions.includes(perm)
                                                        ? 'bg-blue-500 border-blue-500 text-white'
                                                        : 'border-slate-600 group-hover:border-blue-400'
                                                        }`}>
                                                        {rolePermissions.includes(perm) && <Check size={14} strokeWidth={4} />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={rolePermissions.includes(perm)}
                                                        onChange={() => togglePermission(perm)}
                                                        className="hidden"
                                                    />
                                                    <span className={`text-sm font-medium transition ${rolePermissions.includes(perm) ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
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
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12 glass rounded-2xl border-white/5">
                            <Shield size={64} className="mb-4 opacity-20" />
                            <p className="text-xl font-bold">Select a role to manage permissions</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
