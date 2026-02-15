import { useState, useEffect } from 'react';
import { X, Save, User, Mail, Shield, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type User as UserType } from '../../api/admin';

interface UserFormModalProps {
    user: UserType | null;
    roles: any[];
    onClose: () => void;
    onSubmit: (data: any) => void;
    isLoading?: boolean;
}

export function UserFormModal({ user, roles, onClose, onSubmit, isLoading }: UserFormModalProps) {
    const [formData, setFormData] = useState({
        email: '',
        fullName: '',
        roles: [] as string[],
        isActive: true
    });

    useEffect(() => {
        if (user) {
            setFormData({
                email: user.email,
                fullName: user.fullName,
                roles: user.roles,
                isActive: user.isActive
            });
        }
    }, [user]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {user ? <Save size={20} className="text-blue-500" /> : <User size={20} className="text-blue-500" />}
                        {user ? 'Chỉnh sửa Người dùng' : 'Thêm Người dùng mới'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Họ và Tên</label>
                            <div className="relative">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    required
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400"
                                    placeholder="Nguyễn Văn A"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400"
                                    placeholder="example@gmail.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Vai trò</label>
                            <div className="grid grid-cols-2 gap-2">
                                {roles.map((role) => (
                                    <label
                                        key={role.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.roles.includes(role.name)
                                                ? 'border-blue-500 bg-blue-50/50'
                                                : 'border-transparent bg-gray-50 hover:bg-gray-100'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={formData.roles.includes(role.name)}
                                            onChange={(e) => {
                                                const newRoles = e.target.checked
                                                    ? [...formData.roles, role.name]
                                                    : formData.roles.filter(r => r !== role.name);
                                                setFormData({ ...formData, roles: newRoles });
                                            }}
                                        />
                                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${formData.roles.includes(role.name) ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
                                            }`}>
                                            {formData.roles.includes(role.name) && <CheckCircle2 size={14} className="text-white" />}
                                        </div>
                                        <span className={`text-sm font-bold ${formData.roles.includes(role.name) ? 'text-blue-700' : 'text-gray-600'}`}>
                                            {role.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                            <div>
                                <div className="text-sm font-bold text-gray-900">Trạng thái tài khoản</div>
                                <div className="text-xs text-gray-500">Mở hoặc khóa tài khoản hệ thống</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                className={`relative w-12 h-6 rounded-full transition-colors ${formData.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
                            >
                                <motion.div
                                    animate={{ x: formData.isActive ? 24 : 4 }}
                                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                                />
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    <span>{user ? 'Lưu thay đổi' : 'Tạo người dùng'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
