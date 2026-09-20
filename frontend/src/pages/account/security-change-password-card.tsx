import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { authApi } from '../../api/auth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

/** Đổi mật khẩu — `POST /auth/me/change-password` (đã có `authApi.changePassword`). */

const schema = z
    .object({
        currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
        newPassword: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
        confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu mới'),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
        message: 'Mật khẩu nhập lại không khớp',
        path: ['confirmPassword'],
    });

type FormData = z.infer<typeof schema>;

export const ChangePasswordCard = () => {
    const [isSaving, setIsSaving] = useState(false);
    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: FormData) => {
        setIsSaving(true);
        try {
            await authApi.changePassword(data.currentPassword, data.newPassword);
            toast.success('Đã đổi mật khẩu');
            reset();
        } catch (err) {
            const anyErr = err as { response?: { data?: { Error?: string } } };
            toast.error(anyErr.response?.data?.Error || 'Đổi mật khẩu thất bại');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><KeyRound size={16} /> Đổi mật khẩu</h2>
            <Input type="password" label="Mật khẩu hiện tại" {...register('currentPassword')} error={errors.currentPassword?.message} />
            <Input type="password" label="Mật khẩu mới" {...register('newPassword')} error={errors.newPassword?.message} />
            <Input type="password" label="Nhập lại mật khẩu mới" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
            <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" loading={isSaving}>Đổi mật khẩu</Button>
            </div>
        </form>
    );
};

export default ChangePasswordCard;
