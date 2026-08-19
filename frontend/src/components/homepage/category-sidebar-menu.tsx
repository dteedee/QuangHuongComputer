import { Link } from 'react-router-dom';
import { ChevronRight, Laptop, Gamepad, Monitor, Cpu, Wrench, Package } from 'lucide-react';

const SIDEBAR_ITEMS = [
    { icon: Laptop, name: 'Laptop', href: '/products?tag=laptop' },
    { icon: Gamepad, name: 'PC Gaming', href: '/products?tag=pc-gaming' },
    { icon: Monitor, name: 'Màn hình', href: '/products?tag=man-hinh' },
    { icon: Cpu, name: 'Linh kiện', href: '/products?tag=linh-kien' },
    { icon: Wrench, name: 'Sửa chữa', href: '/repairs' },
    { icon: Package, name: 'Phụ kiện', href: '/products?tag=phu-kien' },
];

/**
 * Sidebar danh mục cạnh hero carousel (desktop ≥ lg), theo bố cục 3 cột hacom.vn.
 * Icon + label + chevron, hover đỏ.
 */
export const CategorySidebarMenu = () => (
    <div className="hidden lg:block w-[240px] flex-shrink-0 bg-white rounded-xl border border-gray-100 shadow-small overflow-hidden">
        <ul>
            {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                    <li key={item.name}>
                        <Link
                            to={item.href}
                            className="flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-accent transition-colors border-b border-gray-50 last:border-b-0 cursor-pointer"
                        >
                            <span className="flex items-center gap-3">
                                <Icon size={17} />
                                {item.name}
                            </span>
                            <ChevronRight size={14} className="text-gray-300" />
                        </Link>
                    </li>
                );
            })}
        </ul>
    </div>
);
