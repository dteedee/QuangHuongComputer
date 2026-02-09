import { useState } from 'react';
import { X, Key, Save, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { type User } from '../../api/admin';

interface PasswordResetModalProps {
    user: User;
    onClose: () => void;
    onSubmit: (password: string) => void;
    isLoading?: boolean;
}

export function PasswordResetModal({ user, onClose, onSubmit, isLoading }: PasswordResetModalProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        onSubmit(password);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-amber-50/30">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Key size={20} className="text-amber-500" />
                        Đặt lại Mật khẩu
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 mb-2">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-amber-600 font-bold">
                            {user.fullName.charAt(0)}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-gray-900">{user.fullName}</div>
                            <div className="text-xs text-amber-700 font-medium">{user.email}</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Mật khẩu mới</label>
                            <div className="relative">
                                <input
                                    required
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300"
                                    placeholder="Nhập mật khẩu mới..."
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Xác nhận mật khẩu</label>
                            <input
                                required
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300"
                                placeholder="Nhập lại mật khẩu..."
                            />
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 text-red-500 text-xs font-bold p-3 bg-red-50 rounded-xl"
                            >
                                <AlertCircle size={14} />
                                <span>{error}</span>
                            </motion.div>
                        )}
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
                            className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/30 hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    <span>Cập nhật</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
