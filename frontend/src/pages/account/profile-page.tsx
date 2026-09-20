import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { User as UserIcon, Mail, ShieldCheck } from 'lucide-react';
import { AccountLayout } from '../../layouts/account-layout';
import { authApi, type UserProfile } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

/**
 * `/tai-khoan/profile` — xem + sửa hồ sơ cá nhân. Dùng `authApi.getMyProfile` /
 * `authApi.updateMyProfile` (đã có sẵn trong `api/auth.ts`, gọi đúng `GET/PUT /auth/me`).
 * Đổi mật khẩu & 2FA thuộc trang `/tai-khoan/security` — tách riêng để mỗi trang < 200 dòng.
 */

const profileSchema = z.object({
    fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(100, 'Họ tên quá dài'),
    phoneNumber: z
        .string()
        .optional()
        .refine((v) => !v || /^(0|\+84)[0-9]{9,10}$/.test(v), 'Số điện thoại không hợp lệ'),
    address: z.string().max(255, 'Địa chỉ quá dài').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfilePage = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: { fullName: '', phoneNumber: '', address: '' },
    });

    const load = async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await authApi.getMyProfile();
            setProfile(data);
            reset({
                fullName: data.fullName || '',
                phoneNumber: data.phoneNumber || '',
                address: data.profile?.address || '',
            });
        } catch {
            setError('Không tải được thông tin hồ sơ');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void load(); }, []);

    const onSubmit = async (data: ProfileFormData) => {
        setIsSaving(true);
        try {
            await authApi.updateMyProfile(data);
            toast.success('Đã cập nhật hồ sơ');
            await load();
        } catch (err) {
            const anyErr = err as { response?: { data?: { Error?: string } } };
            toast.error(anyErr.response?.data?.Error || 'Cập nhật hồ sơ thất bại');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AccountLayout breadcrumb={[{ label: 'Hồ sơ cá nhân' }]}>
            <div className="max-w-2xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
                    <p className="text-sm text-gray-500 mt-1">Xem và cập nhật thông tin cá nhân của bạn.</p>
                </div>

                {isLoading ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
                        <p className="text-sm text-red-600 mb-3">{error}</p>
                        <button onClick={load} className="text-sm font-semibold text-accent hover:underline cursor-pointer">Thử lại</button>
                    </div>
                ) : (
                    <>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-xl shrink-0">
                                {(profile?.fullName || profile?.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-gray-900 truncate">{profile?.fullName || user?.fullName}</p>
                                <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5"><Mail size={13} /> {profile?.email}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                                {profile?.roles?.map((r) => (
                                    <Badge key={r} variant="brand">{r}</Badge>
                                ))}
                                {profile?.emailVerified && (
                                    <span className="text-xs text-emerald-600 flex items-center gap-1"><ShieldCheck size={12} /> Email đã xác thực</span>
                                )}
                            </div>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2"><UserIcon size={16} /> Thông tin cá nhân</h2>

                            <Input
                                label="Họ và tên"
                                {...register('fullName')}
                                error={errors.fullName?.message}
                            />
                            <Input
                                label="Số điện thoại"
                                placeholder="0912345678"
                                {...register('phoneNumber')}
                                error={errors.phoneNumber?.message}
                            />
                            <Input
                                label="Địa chỉ"
                                {...register('address')}
                                error={errors.address?.message}
                            />
                            <Input label="Email" value={profile?.email || ''} disabled hint="Email không thể thay đổi" />

                            <div className="flex justify-end pt-2">
                                <Button type="submit" variant="primary" loading={isSaving} disabled={!isDirty}>
                                    Lưu thay đổi
                                </Button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </AccountLayout>
    );
};

export default ProfilePage;
