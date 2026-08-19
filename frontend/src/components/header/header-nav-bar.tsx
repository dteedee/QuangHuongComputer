import { Link, useLocation } from 'react-router-dom';
import {
    Search, ShoppingCart, Menu as MenuIcon, Phone,
    Wrench, Monitor, Laptop, Cpu, Zap,
    Briefcase, MessageCircle, User, Package, FileText
} from 'lucide-react';
import type { Menu } from '../../api/content';

const IconComponents: Record<string, React.ElementType> = {
    'Search': Search, 'ShoppingCart': ShoppingCart, 'Menu': MenuIcon,
    'Phone': Phone, 'Wrench': Wrench, 'Monitor': Monitor,
    'Laptop': Laptop, 'Cpu': Cpu, 'Zap': Zap,
    'Briefcase': Briefcase, 'MessageCircle': MessageCircle,
    'User': User, 'Package': Package, 'FileText': FileText,
};

interface HeaderNavBarProps {
    headerMenu: Menu | null;
    isScrolled?: boolean;
}

/** Category nav row — ẩn khi cuộn để header thu gọn (sticky compact), category vẫn truy cập qua search pill "Danh mục". */
export const HeaderNavBar = ({ headerMenu, isScrolled }: HeaderNavBarProps) => {
    const location = useLocation();

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
    };

    const getLinkClass = (path: string) => {
        const active = isActive(path);
        return [
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap',
            active
                ? 'bg-accent text-white'
                : 'text-gray-700 hover:bg-gray-100 hover:text-accent',
        ].join(' ');
    };

    const renderIcon = (iconName?: string) => {
        if (!iconName) return null;
        const Icon = IconComponents[iconName];
        return Icon ? <Icon size={15} /> : null;
    };

    return (
        <div className={`bg-white border-b border-gray-100 hidden lg:block overflow-hidden transition-all duration-200 ${isScrolled ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100'}`}>
            <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between">
                <nav className="flex items-center gap-1 py-1.5 overflow-x-auto scrollbar-hide">
                    {headerMenu?.items ? (
                        headerMenu.items.map((item) => (
                            <Link
                                key={item.id}
                                to={item.url || '/'}
                                className={`${getLinkClass(item.url || '/')} ${item.cssClass || ''}`}
                                target={item.openInNewTab ? '_blank' : undefined}
                            >
                                {renderIcon(item.icon)} {item.label}
                            </Link>
                        ))
                    ) : (
                        <>
                            <Link to="/products" className={getLinkClass('/products')}>
                                <MenuIcon size={15} /> Danh muc san pham
                            </Link>
                            <Link to="/repairs" className={getLinkClass('/repairs')}>
                                <Wrench size={15} /> Dich vu sua chua
                            </Link>
                            <Link to="/warranty" className={getLinkClass('/warranty')}>
                                <Monitor size={15} /> Bao hanh
                            </Link>
                        </>
                    )}
                </nav>

                <Link
                    to="/policy/promotions"
                    className="flex items-center gap-1 text-xs font-bold text-accent bg-red-50 px-3 py-1.5 rounded-md border border-red-100 hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap"
                >
                    <Zap size={13} className="fill-accent" />
                    SIEU SALE
                </Link>
            </div>
        </div>
    );
};
