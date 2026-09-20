import { AccountLayout } from '../../layouts/account-layout';
import { ChangePasswordCard } from './security-change-password-card';
import { TwoFactorCard } from './security-two-factor-card';
import { SessionsCard } from './security-sessions-card';

/**
 * `/tai-khoan/security` — Bảo mật & đăng nhập. Đổi mật khẩu + 2FA + phiên đăng nhập, mỗi phần
 * tách sang component riêng (`security-*-card.tsx`) để trang này và mỗi component đều < 200 dòng.
 */
export const SecurityPage = () => {
    return (
        <AccountLayout breadcrumb={[{ label: 'Bảo mật & đăng nhập' }]}>
            <div className="max-w-2xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Bảo mật & đăng nhập</h1>
                    <p className="text-sm text-gray-500 mt-1">Quản lý mật khẩu, xác thực 2 bước và các phiên đăng nhập.</p>
                </div>

                <ChangePasswordCard />
                <TwoFactorCard />
                <SessionsCard />
            </div>
        </AccountLayout>
    );
};

export default SecurityPage;
