import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useController, type Control } from 'react-hook-form';
import { useRecaptcha } from '../hooks/useRecaptcha';
import { RECAPTCHA_SITE_KEY, RECAPTCHA_ACTIONS } from '../config/recaptcha';
import { Button, Checkbox } from '../components/ui';
import { useAppForm, TextField, applyServerErrors } from '../components/form';
import { registerSchema, type RegisterFormData } from '../schemas/register';
import confetti from 'canvas-confetti';

/**
 * [W1-9] Reference migration of the form kit — RHF + zod (`registerSchema`),
 * `TextField` for a11y/error wiring, `applyServerErrors` for the backend
 * contract. `acceptDataPolicy` is D08's Luật 122/2025 Đ11.4 consent
 * checkbox; its final copy/placement belongs to W3-8, this is the
 * functional placeholder that ships the required field + validation now.
 */

const KNOWN_FIELDS = ['fullName', 'email', 'password', 'confirmPassword', 'acceptTerms', 'acceptDataPolicy'] as const;

const PasswordToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button type="button" onClick={onToggle} className="text-gray-400 hover:text-accent transition-colors p-1 cursor-pointer">
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
);

/** One checkbox row wired to RHF — shared by `acceptTerms` and `acceptDataPolicy`. */
function ConsentCheckbox({ name, control, label }: { name: 'acceptTerms' | 'acceptDataPolicy'; control: Control<RegisterFormData>; label: React.ReactNode }) {
    const { field, fieldState } = useController({ name, control });
    return (
        <div>
            <Checkbox
                checked={Boolean(field.value)}
                onChange={(e) => field.onChange(e.target.checked)}
                onBlur={field.onBlur}
                label={label}
                error={fieldState.error?.message}
            />
            {fieldState.error && <p className="text-red-500 text-sm ml-6 mt-1">{fieldState.error.message}</p>}
        </div>
    );
}

export const RegisterPage = () => {
    const { register: signup } = useAuth();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [registerSuccess, setRegisterSuccess] = useState(false);
    const { executeRecaptcha } = useRecaptcha(RECAPTCHA_SITE_KEY);

    const form = useAppForm<RegisterFormData>({
        schema: registerSchema,
        defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' } as Partial<RegisterFormData>,
    });
    const { control, handleSubmit, setError, setFocus, formState: { isSubmitting } } = form;

    const triggerConfetti = () => {
        const end = Date.now() + 3000;
        const frame = () => {
            confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#D70018', '#ff4d6d', '#ffd700'] });
            confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#D70018', '#ff4d6d', '#ffd700'] });
            if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
    };

    const onSubmit = handleSubmit(async (data) => {
        try {
            const recaptchaToken = await executeRecaptcha(RECAPTCHA_ACTIONS.REGISTER);
            await signup(data.email, data.password, data.fullName, recaptchaToken);
            setRegisterSuccess(true);
            triggerConfetti();
            setTimeout(() => navigate('/login'), 2500);
        } catch (err) {
            const applied = applyServerErrors(setError, err, KNOWN_FIELDS);
            if (applied[0]) setFocus(applied[0]);
        }
    });

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                    <Link to="/" className="flex items-center justify-center gap-2 mb-8 cursor-pointer">
                        <div className="w-10 h-10 bg-accent text-white rounded-lg flex items-center justify-center font-black text-lg">QH</div>
                        <span className="text-lg font-black text-gray-900 tracking-tight">QUANG HƯỞNG</span>
                    </Link>

                    <AnimatePresence mode="wait">
                        {registerSuccess ? (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 size={32} className="text-emerald-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">Đăng ký thành công!</h2>
                                <p className="text-sm text-gray-500">Đang chuyển hướng đến trang đăng nhập...</p>
                            </motion.div>
                        ) : (
                            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Tạo tài khoản mới</h1>
                                <p className="text-sm text-gray-500 text-center mb-8">Đăng ký để trở thành thành viên của Quang Hưởng.</p>

                                <form onSubmit={onSubmit} className="space-y-4">
                                    <TextField name="fullName" control={control} label="Họ và tên" type="text" icon={User} placeholder="Nhập họ và tên của bạn" />
                                    <TextField name="email" control={control} label="Địa chỉ Email" type="email" icon={Mail} placeholder="name@gmail.com" />
                                    <TextField
                                        name="password" control={control} label="Mật khẩu" type={showPassword ? 'text' : 'password'} icon={Lock}
                                        placeholder="Tối thiểu 6 ký tự" hint="Ít nhất 6 ký tự, có ít nhất 1 chữ thường"
                                        suffix={<PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
                                    />
                                    <TextField
                                        name="confirmPassword" control={control} label="Xác nhận mật khẩu" type={showConfirmPassword ? 'text' : 'password'} icon={Lock}
                                        placeholder="Nhập lại mật khẩu"
                                        suffix={<PasswordToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />}
                                    />

                                    <ConsentCheckbox
                                        name="acceptTerms"
                                        control={control}
                                        label={<>Tôi đồng ý với <Link to="/policy/terms" target="_blank" className="text-accent hover:underline font-bold cursor-pointer">Điều khoản sử dụng</Link> của Quang Hưởng Computer</>}
                                    />
                                    {/*
                                        D08 / Luật 122/2025 Đ11.4 — finalized by W3-8. The checkbox copy itself
                                        must cover: (1) chủ quản (who processes the data), (2) the privacy policy,
                                        (3) the parties' rights & obligations, (4) the complaint channel — not just
                                        a bare "I agree" pointing at one link, since a CMS page can be thin or
                                        missing. Complaint channel links to `/chinh-sach/khieu-nai`, which has real
                                        CMS content (verified via DB); `/policy/privacy` is left linked for the
                                        privacy-policy detail but content team still needs to populate that slug —
                                        filed as an integration request, this checkbox's own text no longer
                                        depends on it to satisfy D08.
                                    */}
                                    <ConsentCheckbox
                                        name="acceptDataPolicy"
                                        control={control}
                                        label={<>
                                            Tôi đồng ý để <strong>Quang Hưởng Computer</strong> (chủ quản trang này) thu thập và xử lý dữ liệu
                                            cá nhân của tôi theo <Link to="/policy/privacy" target="_blank" className="text-accent hover:underline font-bold cursor-pointer">Chính sách bảo mật</Link>,
                                            tôi đã hiểu quyền và nghĩa vụ của các bên, và có thể khiếu nại qua{' '}
                                            <Link to="/chinh-sach/khieu-nai" target="_blank" className="text-accent hover:underline font-bold cursor-pointer">kênh khiếu nại</Link> nếu có vướng mắc.
                                        </>}
                                    />

                                    <Button type="submit" variant="primary" size="lg" loading={isSubmitting} icon={ArrowRight} iconPosition="right" className="w-full cursor-pointer">
                                        Đăng ký tài khoản
                                    </Button>
                                </form>

                                <p className="mt-8 text-center text-sm text-gray-500">
                                    Đã có tài khoản?{' '}
                                    <Link to="/login" className="text-accent font-bold hover:underline cursor-pointer">Đăng nhập ngay</Link>
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};
