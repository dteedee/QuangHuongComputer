import { Link } from 'react-router-dom';
import { ChevronRight, Laptop, Gamepad, Monitor, Cpu, Wrench, Package } from 'lucide-react';

// W0-12 (step 3): trỏ tới route /danh-muc/<slug> đã hoạt động (CategoryPage khớp theo tên
// qua ROUTE_TO_CATEGORY_TITLE — category-route-mapping.ts), thay vì `/products?tag=...` mà
// ProductCatalogPage không lọc được theo tên tĩnh này (man-hinh/linh-kien/phu-kien không khớp
// tên danh mục thật trong DB).
const SIDEBAR_ITEMS = [
    { icon: Laptop, name: 'Laptop', href: '/danh-muc/laptop' },
    { icon: Gamepad, name: 'PC Gaming', href: '/danh-muc/pc-gaming' },
    { icon: Monitor, name: 'Màn hình', href: '/danh-muc/screens' },
    { icon: Cpu, name: 'Linh kiện', href: '/danh-muc/components' },
    { icon: Wrench, name: 'Sửa chữa', href: '/repairs' },
    { icon: Package, name: 'Phụ kiện', href: '/danh-muc/accessories' },
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
