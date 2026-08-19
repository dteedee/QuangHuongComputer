import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Receipt, Store, UserPlus, type LucideIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface QuickAction {
    icon: LucideIcon;
    title: string;
    path: string;
    color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
    { icon: Store, title: 'Mở POS', path: '/backoffice/pos', color: 'bg-blue-500' },
    { icon: Package, title: 'Thêm sản phẩm', path: '/backoffice/products?action=new', color: 'bg-green-500' },
    { icon: Receipt, title: 'Tạo đơn hàng', path: '/backoffice/orders?action=new', color: 'bg-purple-500' },
    { icon: UserPlus, title: 'Thêm khách hàng', path: '/backoffice/crm/customers?action=new', color: 'bg-orange-500' },
];

interface BackofficeQuickActionsPanelProps {
    onSelect: () => void;
}

/** Dropdown with shortcuts to the most common backoffice actions. */
export const BackofficeQuickActionsPanel = ({ onSelect }: BackofficeQuickActionsPanelProps) => {
    const { isDark } = useTheme();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`absolute right-0 mt-2 w-56 rounded-xl shadow-xl border z-50 overflow-hidden ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
        >
            <div className={`p-2 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                <p className={`text-xs font-bold uppercase tracking-wider px-2 py-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Quick Actions
                </p>
            </div>
            <div className="p-2 space-y-1">
                {QUICK_ACTIONS.map((action) => (
                    <Link
                        key={action.path}
                        to={action.path}
                        onClick={onSelect}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                        <span className={`p-1.5 rounded-lg text-white ${action.color}`}><action.icon size={20} /></span>
                        <span className="text-sm font-medium">{action.title}</span>
                    </Link>
                ))}
            </div>
        </motion.div>
    );
};
