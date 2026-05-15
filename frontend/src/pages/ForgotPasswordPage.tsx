import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';
import client from '../api/client';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { validationMessages as msg } from '../lib/validation/messages';

export const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const schema = z.object({
            email: z.string().min(1, msg.requireInput('Email')).email(msg.email)
        });

        const result = schema.safeParse({ email });
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
            await client.post('/auth/forgot-password', { email });
            setIsSubmitted(true);
            toast.success('Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu!');
        } catch (error) {
            toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
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
                            <KeyRound size={28} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Quên mật khẩu?</h1>
                        <p className="text-gray-500 text-sm text-center">
                            Nhập email của bạn và chúng tôi sẽ gửi link đặt lại mật khẩu.
                        </p>
                    </div>

                    {!isSubmitted ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Địa chỉ Email
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
                                {errors.email && (
                                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-accent hover:bg-[#b00014] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Gửi link đặt lại
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="p-5 bg-green-50 border border-green-100 rounded-xl text-green-700 flex items-start gap-3">
                            <CheckCircle size={22} className="flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold mb-1">Email đã được gửi!</p>
                                <p className="text-sm">
                                    Vui lòng kiểm tra hộp thư của bạn và làm theo hướng dẫn để đặt lại mật khẩu.
                                </p>
                            </div>
                        </div>
                    )}

                    <p className="mt-6 text-center text-sm text-gray-500">
                        Nhớ mật khẩu?{' '}
                        <Link to="/login" className="text-accent font-semibold hover:underline cursor-pointer">
                            Đăng nhập ngay
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
