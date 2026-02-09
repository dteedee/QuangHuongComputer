import { useState, useEffect } from 'react';
import { X, Shield, CheckCircle2, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { type User } from '../../api/admin';

interface RoleAssignModalProps {
    user: User;
    availableRoles: any[];
    onClose: () => void;
    onSubmit: (userId: string, roles: string[]) => void;
}

export function RoleAssignModal({ user, availableRoles, onClose, onSubmit }: RoleAssignModalProps) {
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

    useEffect(() => {
        setSelectedRoles(user.roles);
    }, [user]);

    const handleToggleRole = (roleName: string) => {
        setSelectedRoles(prev =>
            prev.includes(roleName)
                ? prev.filter(r => r !== roleName)
                : [...prev, roleName]
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-purple-50/30">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield size={20} className="text-purple-500" />
                        Phân vai trò: <span className="text-purple-600">{user.fullName}</span>
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <p className="text-gray-500 text-sm">Chọn các vai trò mà bạn muốn gán cho tài khoản này. Người dùng sẽ có tất cả các quyền thuộc về các vai trò được chọn.</p>

                    <div className="grid grid-cols-1 gap-3">
                        {availableRoles.map((role) => {
                            const isActive = selectedRoles.includes(role.name);
                            return (
                                <motion.button
                                    whileHover={{ x: 4 }}
                                    key={role.id}
                                    onClick={() => handleToggleRole(role.name)}
                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${isActive
                                            ? 'border-purple-500 bg-purple-50/50 shadow-sm'
                                            : 'border-transparent bg-gray-50 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${isActive ? 'bg-purple-100 text-purple-600' : 'bg-white text-gray-400'}`}>
                                            <Shield size={18} />
                                        </div>
                                        <div className="text-left">
                                            <div className={`font-bold ${isActive ? 'text-purple-900' : 'text-gray-700'}`}>{role.name}</div>
                                            {role.description && <div className="text-xs text-gray-500 font-medium">{role.description}</div>}
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${isActive ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-200 group-hover:border-gray-300'
                                        }`}>
                                        {isActive && <CheckCircle2 size={16} className="text-white" />}
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={() => onSubmit(user.id, selectedRoles)}
                            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/30 hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            <span>Lưu thay đổi</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
