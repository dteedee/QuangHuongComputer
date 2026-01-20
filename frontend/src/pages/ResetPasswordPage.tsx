import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import client from '../api/client';
import toast from 'react-hot-toast';

export const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!token) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 font-sans">
                <div className="w-full max-w-[500px] bg-white rounded-3xl overflow-hidden shadow-2xl p-12">
                    <div className="text-center">
                        <ShieldCheck size={64} className="text-red-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-black text-gray-800 mb-2 uppercase">Link không hợp lệ</h1>
                        <p className="text-gray-500 mb-6">Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p>
                        <Link
                            to="/forgot-password"
                            className="inline-flex items-center gap-2 text-[#D70018] hover:underline font-black"
                        >
                            <ArrowLeft size={18} />
                            Yêu cầu link mới
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        setIsLoading(true);

        try {
            await client.post('/auth/reset-password', {
                token,
                newPassword
            });
            toast.success('Mật khẩu đã được đặt lại thành công!');
            navigate('/login');
        } catch (error: any) {
            const errorMessage = error.response?.data?.Message || 'Token không hợp lệ hoặc đã hết hạn';
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
                    <Link to="/login" className="inline-flex items-center gap-2 text-gray-600 hover:text-[#D70018] mb-8 font-bold transition-colors">
                        <ArrowLeft size={18} />
                        Quay lại đăng nhập
                    </Link>

                    <div className="mb-10">
                        <h1 className="text-3xl font-black text-gray-800 mb-2 uppercase italic">Đặt lại mật khẩu</h1>
                        <p className="text-gray-500 font-medium italic">
                            Nhập mật khẩu mới cho tài khoản của bạn.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
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
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D70018]/20 focus:border-[#D70018] transition-all"
                                    placeholder="Tối thiểu 6 ký tự"
                                    required
                                    minLength={6}
                                />
                            </div>
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
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D70018]/20 focus:border-[#D70018] transition-all"
                                    placeholder="Nhập lại mật khẩu"
                                    required
                                    minLength={6}
                                />
                            </div>
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
                            className="w-full py-4 bg-[#D70018] hover:bg-[#b50014] text-white font-black rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm"
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
