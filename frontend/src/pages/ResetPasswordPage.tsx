import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, ShieldCheck, ArrowLeft, Mail } from 'lucide-react';
import client from '../api/client';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

/**
 * [W3-8 fix] `ResetPasswordDto` (`backend/Services/Identity/DTOs/AuthDtos.cs`) is
 * `{ email, code, newPassword }` (`token` accepted as a legacy alias for `code`) — a reset code is
 * looked up by e-mail, never by the code alone (that WAS a takeover bug per that file's own
 * comment). The reset e-mail's link (`EmailService.cs`) is a bare `/reset-password` with NO query
 * params at all — the 6-digit code is in the e-mail body, not the URL. This page previously asked
 * only for a "token" (from a `?token=` query param that never exists) and never sent `email`, so
 * every reset attempt failed. Now collects e-mail + the 6-digit code + new password.
 */
export const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const schema = z.object({
            email: z.string().min(1, msg.requireInput('Email')).email(msg.email),
            code: z.string().regex(/^[0-9]{6}$/, 'Mã xác nhận gồm 6 chữ số'),
            // Mirrors the Identity password policy (RequiredLength=6, no complexity) — see
            // `schemas/user.ts`'s `passwordPolicySchema` / `AuthRequestValidators.cs`.
            newPassword: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(128, 'Mật khẩu tối đa 128 ký tự'),
            confirmPassword: z.string().min(1, msg.requireInput('Xác nhận mật khẩu')),
        }).refine((data) => data.newPassword === data.confirmPassword, {
            message: 'Mật khẩu xác nhận không khớp',
            path: ['confirmPassword']
        });

        const result = schema.safeParse({ email, code, newPassword, confirmPassword });
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
            await client.post('/auth/reset-password', { email, code, newPassword });
            toast.success('Mật khẩu đã được đặt lại thành công!');
            navigate('/login');
        } catch (error: any) {
            if (error?.response?.status === 429) {
                const retryMessage = 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.';
                setError(retryMessage);
                toast.error(retryMessage);
                return;
            }
            const errorMessage = error.response?.data?.Message || error.response?.data?.message || 'Mã xác nhận không hợp lệ hoặc đã hết hạn';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-4 font-sans">
            <div className="w-full max-w-md mx-auto">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                    {/* Back link */}
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-accent mb-6 transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={16} />
                        Quay lại đăng nhập
                    </Link>

                    {/* Icon + Heading */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-14 h-14 bg-red-50 text-accent rounded-xl flex items-center justify-center mb-4">
                            <Lock size={28} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Đặt lại mật khẩu</h1>
                        <p className="text-gray-500 text-sm text-center">
                            Nhập mã xác nhận từ email và mật khẩu mới của bạn.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email — the code is looked up by e-mail, never by the code alone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all ${errors.email ? 'border-red-400 bg-red-50/50' : 'border-gray-200'}`}
                                    placeholder="name@gmail.com"
                                />
                            </div>
                            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                        </div>

                        {/* Code */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mã xác nhận (6 số, gửi qua email)
                            </label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all font-mono tracking-widest ${errors.code ? 'border-red-400 bg-red-50/50' : 'border-gray-200'}`}
                                    placeholder="000000"
                                    maxLength={6}
                                />
                            </div>
                            {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}
                        </div>

                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mật khẩu mới
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all ${errors.newPassword ? 'border-red-400 bg-red-50/50' : 'border-gray-200'}`}
                                    placeholder="Tối thiểu 6 ký tự"
                                />
                            </div>
                            {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Xác nhận mật khẩu
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all ${errors.confirmPassword ? 'border-red-400 bg-red-50/50' : 'border-gray-200'}`}
                                    placeholder="Nhập lại mật khẩu"
                                />
                            </div>
                            {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-3">
                                <ShieldCheck size={18} className="flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-accent hover:bg-[#b00014] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
