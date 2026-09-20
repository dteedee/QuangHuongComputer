/**
 * Bảng lối tắt bung ra từ nút "Thao tác nhanh" trên topbar.
 *
 * §9.1: bỏ 4 ô màu `bg-blue-500/green/purple/orange` — trong back office màu không mang
 * thông tin gì ở đây, chỉ gây nhiễu. Icon dùng `text-fg-muted`, hàng gọn 32px.
 * §9.5: "Quick Actions" → "Thao tác nhanh".
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Receipt, Store, UserPlus, type LucideIcon } from 'lucide-react';

interface QuickAction {
    icon: LucideIcon;
    title: string;
    path: string;
}

const QUICK_ACTIONS: QuickAction[] = [
    { icon: Store, title: 'Mở POS', path: '/backoffice/pos' },
    { icon: Package, title: 'Thêm sản phẩm', path: '/backoffice/products?action=new' },
    { icon: Receipt, title: 'Tạo đơn hàng', path: '/backoffice/orders?action=new' },
    { icon: UserPlus, title: 'Thêm khách hàng', path: '/backoffice/crm/customers?action=new' },
];

interface BackofficeQuickActionsPanelProps {
    onSelect: () => void;
}

export const BackofficeQuickActionsPanel = ({ onSelect }: BackofficeQuickActionsPanelProps) => (
    <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        className="absolute right-0 z-floating mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
    >
        <p className="border-b border-line px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
            Thao tác nhanh
        </p>
        <div className="p-1.5">
            {QUICK_ACTIONS.map((action) => (
                <Link
                    key={action.path}
                    to={action.path}
                    onClick={onSelect}
                    className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-13 font-medium text-fg transition-colors hover:bg-sunken"
                >
                    <action.icon size={16} className="shrink-0 text-fg-muted" aria-hidden />
                    {action.title}
                </Link>
            ))}
        </div>
    </motion.div>
);
