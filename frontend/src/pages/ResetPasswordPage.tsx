import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import client from '../api/client';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

export const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const urlToken = searchParams.get('token');

    const [token, setToken] = useState(urlToken || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const schema = z.object({
            token: z.string().min(1, msg.requireInput('Mã xác nhận')),
            newPassword: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
            confirmPassword: z.string().min(1, msg.requireInput('Xác nhận mật khẩu')),
        }).refine((data) => data.newPassword === data.confirmPassword, {
            message: 'Mật khẩu xác nhận không khớp',
            path: ['confirmPassword']
        });

        const result = schema.safeParse({ token, newPassword, confirmPassword });
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
        setIsLoading(true);

        try {
            await client.post('/auth/reset-password', {
                token,
                newPassword
            });
            toast.success('Mật khẩu đã được đặt lại thành công!');
            navigate('/login');
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.response?.data?.Message || 'Mã xác nhận không hợp lệ hoặc đã hết hạn';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[500px] bg-white rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
                <div className="p-8 lg:p-12">
                    <Link to="/login" className="inline-flex items-center gap-2 text-gray-600 hover:text-accent mb-8 font-bold transition-colors">
                        <ArrowLeft size={18} />
                        Quay lại đăng nhập
                    </Link>

                    <div className="mb-10">
                        <h1 className="text-3xl font-black text-gray-800 mb-2 uppercase italic">Đặt lại mật khẩu</h1>
                        <p className="text-gray-500 font-medium italic">
                            Nhập mã xác nhận từ email và mật khẩu mới của bạn.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">
                                Mã xác nhận (6 chữ số)
                            </label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border ${errors.token ? 'border-red-400 bg-red-50/50' : 'border-gray-200 focus:border-accent'} rounded-xl text-gray-900 font-bold tracking-[0.5em] focus:outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-accent/20 transition-all`}
                                    placeholder="000000"
                                    maxLength={20}
                                />
                            </div>
                            {errors.token && <p className="text-red-500 text-sm font-medium animate-fade-in-up mt-1">{errors.token}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">
                                Mật khẩu mới
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border ${errors.newPassword ? 'border-red-400 bg-red-50/50' : 'border-gray-200 focus:border-accent'} rounded-xl text-gray-900 focus:outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-accent/20 transition-all`}
                                    placeholder="Tối thiểu 6 ký tự"
                                />
                            </div>
                            {errors.newPassword && <p className="text-red-500 text-sm font-medium animate-fade-in-up mt-1">{errors.newPassword}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">
                                Xác nhận mật khẩu
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border ${errors.confirmPassword ? 'border-red-400 bg-red-50/50' : 'border-gray-200 focus:border-accent'} rounded-xl text-gray-900 focus:outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-accent/20 transition-all`}
                                    placeholder="Nhập lại mật khẩu"
                                />
                            </div>
                            {errors.confirmPassword && <p className="text-red-500 text-sm font-medium animate-fade-in-up mt-1">{errors.confirmPassword}</p>}
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold flex items-center gap-3 animate-shake">
                                <ShieldCheck size={18} />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-accent hover:bg-accent-hover text-white font-black rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Đặt lại mật khẩu
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
