import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import client from '../api/client';
import toast from 'react-hot-toast';

export const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-[500px] bg-white rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
                <div className="p-8 lg:p-12">
                    <Link to="/login" className="inline-flex items-center gap-2 text-gray-600 hover:text-[#D70018] mb-8 font-bold transition-colors">
                        <ArrowLeft size={18} />
                        Quay lại đăng nhập
                    </Link>

                    <div className="mb-10">
                        <h1 className="text-3xl font-black text-gray-800 mb-2 uppercase italic">Quên mật khẩu?</h1>
                        <p className="text-gray-500 font-medium italic">
                            Nhập email của bạn và chúng tôi sẽ gửi link đặt lại mật khẩu.
                        </p>
                    </div>

                    {!isSubmitted ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">
                                    Địa chỉ Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D70018]/20 focus:border-[#D70018] transition-all"
                                        placeholder="name@gmail.com"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-[#D70018] hover:bg-[#b50014] text-white font-black rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm"
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
                        <div className="p-6 bg-green-50 border border-green-100 rounded-xl text-green-700 font-bold flex items-start gap-3">
                            <ShieldCheck size={24} className="flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="mb-2">Email đã được gửi!</p>
                                <p className="text-sm font-medium">
                                    Vui lòng kiểm tra hộp thư của bạn và làm theo hướng dẫn để đặt lại mật khẩu.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 text-center text-gray-500 text-sm font-medium italic">
                        Nhớ mật khẩu?{' '}
                        <Link to="/login" className="text-[#D70018] hover:underline font-black not-italic">
                            Đăng nhập ngay
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
