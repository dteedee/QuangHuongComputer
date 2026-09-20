import { Link, useNavigate } from 'react-router-dom';
import { Store, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { buttonVariants } from '../ui/variants';
import { IconButton } from '../ui/icon-button';
import { BackofficeSidebarNav } from './backoffice-sidebar-nav';
import type { ResolvedMenuGroup } from './backoffice-menu-types';
import { ROUTES } from '../../routes';

interface BackofficeSidebarProps {
    collapsed: boolean;
    groups: ResolvedMenuGroup[];
    expandedGroups: string[];
    onToggleGroup: (id: string) => void;
    isActive: (path: string) => boolean;
    isGroupActive: (groupId: string) => boolean;
}

/**
 * Ruột sidebar, dùng chung cho thanh desktop và ngăn kéo mobile.
 *
 * Đã gỡ 2 ô thống kê "Đơn chờ / Doanh thu" (design-guidelines §9.6: "Không nhồi số liệu vào
 * sidebar. Sidebar để điều hướng; số liệu thuộc về dashboard") — hai ô này còn vi phạm luôn
 * quy tắc "mọi con số tiền phải có đơn vị" vì hiển thị "0" trống không.
 *
 * "Quay về trang chủ" là liên kết `ghost` nhỏ, không còn nút đỏ tràn chiều ngang: đỏ chỉ
 * dành cho hành động chính của trang và chỉ báo mục đang chọn (§9.1).
 * Không còn ternary sáng/tối — token tự lật ở `tokens.css`.
 */
export const BackofficeSidebar = ({
    collapsed, groups, expandedGroups, onToggleGroup, isActive, isGroupActive,
}: BackofficeSidebarProps) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const role = user?.roles?.[0];

    return (
        <div className="flex h-full flex-col bg-surface">
            {/* Thương hiệu */}
            <div className={cn(
                'flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-4',
                collapsed && 'justify-center px-0',
            )}>
                <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white"
                >
                    QH
                </span>
                {!collapsed && (
                    <span className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-13 font-semibold text-fg">Quang Hưởng</span>
                        <span className="text-2xs font-medium text-fg-subtle">Trang quản trị</span>
                    </span>
                )}
            </div>

            <BackofficeSidebarNav
                groups={groups}
                collapsed={collapsed}
                expandedGroups={expandedGroups}
                onToggleGroup={onToggleGroup}
                isActive={isActive}
                isGroupActive={isGroupActive}
            />

            {/* Chân: liên kết phụ + tài khoản */}
            <div className="shrink-0 border-t border-line p-2">
                <Link
                    to={ROUTES.HOME}
                    title={collapsed ? 'Quay về trang chủ' : undefined}
                    className={cn(
                        buttonVariants({ variant: 'ghost', size: 'sm' }),
                        'w-full text-13 font-medium',
                        collapsed ? 'px-0' : 'justify-start',
                    )}
                >
                    <Store size={16} aria-hidden />
                    {!collapsed && 'Quay về trang chủ'}
                </Link>

                <div className={cn(
                    'mt-1 flex items-center gap-2 rounded-md px-2 py-1.5',
                    collapsed && 'justify-center px-0',
                )}>
                    <span
                        aria-hidden
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken text-13 font-bold text-fg-muted"
                    >
                        {user?.fullName?.charAt(0) ?? '?'}
                    </span>
                    {!collapsed && (
                        <>
                            <span className="flex min-w-0 flex-1 flex-col leading-tight">
                                <span className="truncate text-13 font-medium text-fg">{user?.fullName}</span>
                                <span className="truncate text-2xs text-fg-subtle">{role}</span>
                            </span>
                            <IconButton
                                size="sm"
                                aria-label="Đăng xuất"
                                title="Đăng xuất"
                                onClick={() => { logout(); navigate(ROUTES.LOGIN); }}
                            >
                                <LogOut size={16} aria-hidden />
                            </IconButton>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
