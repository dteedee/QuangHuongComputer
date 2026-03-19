
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, ShieldCheck, Zap, Laptop, Eye, EyeOff, CheckCircle2, Gift, Headphones, Truck } from 'lucide-react';
import { useRecaptcha } from '../hooks/useRecaptcha';
import { RECAPTCHA_SITE_KEY, RECAPTCHA_ACTIONS } from '../config/recaptcha';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import confetti from 'canvas-confetti';

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
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [registerSuccess, setRegisterSuccess] = useState(false);
    const { executeRecaptcha } = useRecaptcha(RECAPTCHA_SITE_KEY);

    const triggerConfetti = () => {
        const duration = 3 * 1000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#D70018', '#ff4d6d', '#ffd700']
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#D70018', '#ff4d6d', '#ffd700']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    };

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

            // Show success animation
            setRegisterSuccess(true);
            triggerConfetti();

            // Navigate after animation
            setTimeout(() => {
                navigate('/login');
            }, 2500);
        } catch (err: unknown) {
            // Extract error message from backend response
            const axiosError = err as { response?: { data?: { message?: string; errors?: Array<{ description?: string }> } } };
            const errors = axiosError.response?.data?.errors;
            if (errors && errors.length > 0) {
                // ASP.NET Identity returns errors array with description field
                const errorMessages = errors.map(e => e.description).filter(Boolean).join('. ');
                setError(errorMessages || 'Đăng ký thất bại. Vui lòng thử lại.');
            } else {
                setError(axiosError.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute -top-40 -left-40 w-80 h-80 bg-[#D70018]/10 rounded-full blur-3xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#D70018]/5 rounded-full blur-3xl"
                    animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[1100px] grid lg:grid-cols-2 gap-0 bg-white rounded-3xl overflow-hidden shadow-2xl relative z-10"
            >

                {/* Visual Side */}
                <div className="hidden lg:flex bg-gradient-to-br from-[#D70018] via-[#c50016] to-[#a00012] p-12 flex-col justify-between relative overflow-hidden order-last">
                    {/* Animated shapes */}
                    <motion.div
                        className="absolute top-20 left-20 w-32 h-32 border border-white/10 rounded-2xl"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                        className="absolute bottom-32 right-10 w-20 h-20 border border-white/10 rounded-full"
                        animate={{ y: [-10, 10, -10], x: [-5, 5, -5] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    />

                    <div className="relative z-10">
                        <Link to="/" className="flex items-center gap-3 mb-16 group">
                            <motion.div
                                whileHover={{ rotate: -12, scale: 1.1 }}
                                className="w-12 h-12 bg-white text-[#D70018] rounded-xl flex items-center justify-center font-black text-2xl shadow-lg"
                            >
                                QH
                            </motion.div>
                            <span className="text-xl font-black text-white tracking-tighter">QUANG HƯỞNG</span>
                        </Link>

                        <motion.h2
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="text-5xl font-extrabold text-white leading-tight mb-8 italic uppercase"
                        >
                            Gia nhập<br />
                            Cộng đồng<br />
                            Công nghệ.
                        </motion.h2>

                        <motion.ul
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                            className="space-y-4 text-white/90"
                        >
                            {[
                                { icon: Zap, text: 'Hỗ trợ & Bảo hành ưu việt', color: 'text-yellow-400' },
                                { icon: Laptop, text: 'Ưu đãi phần cứng độc quyền', color: 'text-white' },
                                { icon: Gift, text: 'Quà tặng chào mừng thành viên', color: 'text-pink-300' },
                                { icon: Truck, text: 'Miễn phí vận chuyển', color: 'text-emerald-300' },
                            ].map((item, index) => (
                                <motion.li
                                    key={index}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                                    className="flex items-center gap-4 group"
                                >
                                    <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                                        <item.icon className={item.color} size={22} />
                                    </div>
                                    <span className="font-bold">{item.text}</span>
                                </motion.li>
                            ))}
                        </motion.ul>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.6 }}
                        className="relative z-10 p-6 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm"
                    >
                        <p className="text-white font-medium italic mb-2">"Dịch vụ tại Quang Hưởng thực sự đẳng cấp, đội ngũ kỹ thuật rất chuyên nghiệp."</p>
                        <div className="flex items-center gap-2 mt-3">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white text-sm font-bold">MA</div>
                            <p className="text-white text-sm font-black uppercase opacity-80">Minh Anh, Gamer & Streamer</p>
                        </div>
                    </motion.div>

                    {/* Decorative pattern */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/5 pointer-events-none">
                        <User size={500} strokeWidth={0.5} />
                    </div>
                </div>

                {/* Form Side */}
                <div className="p-8 lg:p-12 flex flex-col justify-center bg-white relative overflow-y-auto max-h-screen">
                    <AnimatePresence mode="wait">
                        {registerSuccess ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-16"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                    className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
                                >
                                    <CheckCircle2 size={48} className="text-emerald-600" />
                                </motion.div>
                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-2xl font-black text-gray-900 mb-2"
                                >
                                    Đăng ký thành công!
                                </motion.h2>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-gray-500 mb-4"
                                >
                                    Chào mừng bạn đến với Quang Hưởng Computer
                                </motion.p>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-sm text-gray-400"
                                >
                                    Đang chuyển hướng đến trang đăng nhập...
                                </motion.p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="mb-8"
                                >
                                    <h1 className="text-3xl font-black text-gray-800 mb-2 uppercase italic">Tạo tài khoản mới</h1>
                                    <p className="text-gray-500 font-medium italic">Đăng ký để trở thành thành viên của gia đình Quang Hưởng.</p>
                                </motion.div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <Input
                                            label="Họ và tên"
                                            type="text"
                                            icon={User}
                                            placeholder="Nhập họ và tên của bạn"
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            required
                                        />
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.25 }}
                                    >
                                        <Input
                                            label="Địa chỉ Email"
                                            type="email"
                                            icon={Mail}
                                            placeholder="name@gmail.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                        />
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <Input
                                            label="Mật khẩu"
                                            type={showPassword ? 'text' : 'password'}
                                            icon={Lock}
                                            placeholder="Tối thiểu 6 ký tự"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                            hint="Mật khẩu cần ít nhất 6 ký tự"
                                            suffix={
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="text-gray-400 hover:text-[#D70018] focus:outline-none transition-colors p-1"
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            }
                                        />
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.35 }}
                                    >
                                        <Input
                                            label="Xác nhận mật khẩu"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            icon={Lock}
                                            placeholder="Nhập lại mật khẩu"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            required
                                            error={confirmPassword && password !== confirmPassword ? 'Mật khẩu không khớp' : undefined}
                                            suffix={
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="text-gray-400 hover:text-[#D70018] focus:outline-none transition-colors p-1"
                                                >
                                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            }
                                        />
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="flex items-start gap-3"
                                    >
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                id="acceptTerms"
                                                checked={acceptTerms}
                                                onChange={(e) => setAcceptTerms(e.target.checked)}
                                                className="peer sr-only"
                                            />
                                            <label
                                                htmlFor="acceptTerms"
                                                className="w-5 h-5 border-2 border-gray-300 rounded flex items-center justify-center cursor-pointer transition-all peer-checked:bg-[#D70018] peer-checked:border-[#D70018] hover:border-[#D70018]"
                                            >
                                                {acceptTerms && (
                                                    <motion.svg
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="w-3 h-3 text-white"
                                                        viewBox="0 0 12 10"
                                                    >
                                                        <path fill="currentColor" d="M10.28.72a1 1 0 0 1 0 1.41l-5.5 5.5a1 1 0 0 1-1.41 0l-2.5-2.5a1 1 0 1 1 1.41-1.41L4.5 6.54l4.78-4.82a1 1 0 0 1 1.41 0z" />
                                                    </motion.svg>
                                                )}
                                            </label>
                                        </div>
                                        <label htmlFor="acceptTerms" className="text-sm text-gray-600 font-medium cursor-pointer">
                                            Tôi đồng ý với{' '}
                                            <Link to="/policy/terms" target="_blank" className="text-[#D70018] hover:underline font-bold">
                                                Điều khoản sử dụng
                                            </Link>
                                            {' '}của Quang Hưởng Computer
                                        </label>
                                    </motion.div>

                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10, height: 0 }}
                                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                exit={{ opacity: 0, y: -10, height: 0 }}
                                                className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold flex items-center gap-3"
                                            >
                                                <ShieldCheck size={18} />
                                                {error}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.45 }}
                                    >
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="lg"
                                            loading={loading}
                                            icon={ArrowRight}
                                            iconPosition="right"
                                            className="w-full group"
                                        >
                                            Đăng ký tài khoản
                                        </Button>
                                    </motion.div>
                                </form>

                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="mt-8 text-center text-gray-500 text-sm font-medium italic"
                                >
                                    Đã có tài khoản?{' '}
                                    <Link to="/login" className="text-[#D70018] hover:underline font-black not-italic transition-colors hover:text-[#b50014]">
                                        Đăng nhập ngay
                                    </Link>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};
