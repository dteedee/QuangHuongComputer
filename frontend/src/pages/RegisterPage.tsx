
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, ShieldCheck, Zap, Laptop } from 'lucide-react';
import { useRecaptcha } from '../hooks/useRecaptcha';
import { RECAPTCHA_SITE_KEY, RECAPTCHA_ACTIONS } from '../config/recaptcha';

export const RegisterPage = () => {
    const { register: signup } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { isLoaded, executeRecaptcha } = useRecaptcha(RECAPTCHA_SITE_KEY);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!acceptTerms) {
            setError('Vui lòng đồng ý với điều khoản sử dụng');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            setLoading(false);
            return;
        }

        try {
            // Get reCAPTCHA token
            const recaptchaToken = await executeRecaptcha(RECAPTCHA_ACTIONS.REGISTER);

            await signup(email, password, fullName, recaptchaToken);
            navigate('/login');
        } catch {
            setError('Đăng ký thất bại. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
            <div className="w-full max-w-[1100px] grid lg:grid-cols-2 gap-0 bg-white rounded-3xl overflow-hidden shadow-2xl animate-fade-in relative z-10">

                {/* Visual Side */}
                <div className="hidden lg:flex bg-[#D70018] p-12 flex-col justify-between relative overflow-hidden order-last">
                    <div className="relative z-10">
                        <Link to="/" className="flex items-center gap-3 mb-16 group">
                            <div className="w-12 h-12 bg-white text-[#D70018] rounded-xl flex items-center justify-center font-black text-2xl transition-transform group-hover:rotate-12">QH</div>
                            <span className="text-xl font-black text-white tracking-tighter">QUANG HƯỞNG</span>
                        </Link>

                        <h2 className="text-5xl font-extrabold text-white leading-tight mb-6 italic uppercase">
                            Gia nhập<br />
                            Cộng đồng<br />
                            Công nghệ.
                        </h2>
                        <ul className="space-y-6 text-white/80">
                            <li className="flex items-center gap-4">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <Zap className="text-yellow-400" size={24} />
                                </div>
                                <span className="font-bold text-lg">Hỗ trợ & Bảo hành ưu việt</span>
                            </li>
                            <li className="flex items-center gap-4">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <Laptop className="text-white" size={24} />
                                </div>
                                <span className="font-bold text-lg">Ưu đãi phần cứng độc quyền</span>
                            </li>
                        </ul>
                    </div>

                    <div className="relative z-10 p-8 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm">
                        <p className="text-white font-medium italic mb-2">"Dịch vụ tại Quang Hưởng thực sự đẳng cấp, đội ngũ kỹ thuật rất chuyên nghiệp."</p>
                        <p className="text-white text-sm font-black uppercase opacity-60">— Minh Anh, Gamer & Streamer</p>
                    </div>

                    {/* Decorative pattern */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/5 pointer-events-none">
                        <User size={500} strokeWidth={0.5} />
                    </div>
                </div>

                {/* Form Side */}
                <div className="p-8 lg:p-16 flex flex-col justify-center bg-white">
                    <div className="mb-10">
                        <h1 className="text-3xl font-black text-gray-800 mb-2 uppercase italic">Tạo tài khoản mới</h1>
                        <p className="text-gray-500 font-medium italic">Đăng ký để trở thành thành viên của gia đình Quang Hưởng.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Họ và tên</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D70018]/20 focus:border-[#D70018] transition-all"
                                    placeholder="Nhập họ và tên của bạn"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Địa chỉ Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D70018]/20 focus:border-[#D70018] transition-all"
                                    placeholder="name@gmail.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Mật khẩu</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D70018]/20 focus:border-[#D70018] transition-all"
                                    placeholder="Tối thiểu 6 ký tự"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Xác nhận mật khẩu</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D70018]/20 focus:border-[#D70018] transition-all"
                                    placeholder="Nhập lại mật khẩu"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                id="acceptTerms"
                                checked={acceptTerms}
                                onChange={(e) => setAcceptTerms(e.target.checked)}
                                className="mt-1 w-4 h-4 text-[#D70018] border-gray-300 rounded focus:ring-[#D70018]"
                            />
                            <label htmlFor="acceptTerms" className="text-sm text-gray-600 font-medium">
                                Tôi đồng ý với{' '}
                                <Link to="/policy/terms" target="_blank" className="text-[#D70018] hover:underline font-bold">
                                    Điều khoản sử dụng
                                </Link>
                                {' '}của Quang Hưởng Computer
                            </label>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold flex items-center gap-3">
                                <ShieldCheck size={18} />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-[#D70018] hover:bg-[#b50014] text-white font-black rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-4 uppercase tracking-widest text-sm"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Đăng ký tài khoản
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center text-gray-500 text-sm font-medium italic">
                        Đã có tài khoản?{' '}
                        <Link to="/login" className="text-[#D70018] hover:underline font-black not-italic">
                            Đăng nhập ngay
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
