import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { FontSizeToggle } from '../ui/font-size-toggle';
import { HeaderSearchAutocomplete } from './header-search-autocomplete';
import { HeaderMegaMenu } from './header-mega-menu';
import {
    Search, ShoppingCart, Menu as MenuIcon,
    MessageCircle, PackageSearch
} from 'lucide-react';
import type { PublicCategory } from '../../api/catalog/public-listing';
import { ROUTES } from '../../routes/route-paths';

interface HeaderMainBarProps {
    isScrolled: boolean;
    companyBrand1: string;
    companyBrand2: string;
    categories: PublicCategory[];
    categoriesLoading?: boolean;
    onCartClick: () => void;
    onChatClick?: () => void;
    onMobileMenuOpen: () => void;
    onMobileSearchOpen: () => void;
}

/** Main header (74px) theo hacom.vn: logo | search pill bo tron vien do | Xay dung PC | Tra cuu don hang | Gio hang. */
export const HeaderMainBar = ({
    isScrolled, companyBrand1, companyBrand2,
    categories, categoriesLoading, onCartClick, onChatClick, onMobileMenuOpen, onMobileSearchOpen
}: HeaderMainBarProps) => {
    const { itemCount } = useCart();

    return (
        <div className={`bg-white border-b border-gray-100 transition-all duration-200 ${isScrolled ? 'py-2' : 'py-3'}`}>
            <div className="max-w-[1400px] mx-auto px-4 flex items-center gap-4 lg:gap-6">
                {/* Mobile hamburger */}
                <button
                    onClick={onMobileMenuOpen}
                    className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-accent transition-colors cursor-pointer"
                    aria-label="Menu"
                >
                    <MenuIcon size={22} />
                </button>

                {/* Logo */}
                <Link
                    to={ROUTES.HOME}
                    className="flex-shrink-0 flex items-center gap-2.5 group"
                    aria-label={`${companyBrand1} ${companyBrand2}`}
                >
                    <img
                        src="/brand/logo-square.svg"
                        alt=""
                        aria-hidden="true"
                        className={`rounded-lg shadow-md group-hover:shadow-brand transition-all duration-200 ${isScrolled ? 'w-9 h-9' : 'w-11 h-11'}`}
                    />
                    <div className="hidden sm:flex flex-col">
                        <span className={`font-black text-accent uppercase tracking-tight leading-none transition-all duration-200 ${isScrolled ? 'text-base' : 'text-lg'}`}>
                            {companyBrand1}
                        </span>
                        <span className="text-[9px] font-bold text-gray-500 tracking-[0.15em] uppercase mt-0.5">
                            {companyBrand2}
                        </span>
                    </div>
                </Link>

                {/* Mega menu (desktop) — cây danh mục thật từ /catalog/categories */}
                <div className="hidden lg:block">
                    <HeaderMegaMenu categories={categories} isLoading={categoriesLoading} />
                </div>

                {/* Search + gợi ý (desktop) */}
                <div className="flex-1 max-w-2xl hidden md:block">
                    <HeaderSearchAutocomplete categories={categories} />
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0 ml-auto">
                    {/* Mobile search */}
                    <button
                        onClick={onMobileSearchOpen}
                        className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-accent transition-colors cursor-pointer"
                        aria-label="Tìm kiếm"
                    >
                        <Search size={20} />
                    </button>

                    {/* Font-size toggle — chỉ khu khách hàng, giúp người lớn tuổi đọc dễ hơn */}
                    <FontSizeToggle />

                    {/* W0-12 (step 5): PC Builder ẩn tới khi tính năng ra mắt thật ở W3-9 —
                        trước trỏ tới /products?tag=build-pc, không route nào xử lý -> dead-end. */}
                    <Link
                        to={`${ROUTES.ACCOUNT}/orders`}
                        className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-accent transition-colors cursor-pointer whitespace-nowrap"
                    >
                        <PackageSearch size={18} />
                        <span className="text-sm font-medium">Tra cứu đơn hàng</span>
                    </Link>

                    {/* Chat button - desktop */}
                    <button
                        onClick={onChatClick || (() => window.dispatchEvent(new Event('open-chat')))}
                        className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-accent transition-colors cursor-pointer"
                        aria-label="Chat"
                    >
                        <MessageCircle size={20} />
                        <span className="text-sm font-medium">Chat</span>
                    </button>

                    {/* Cart button */}
                    <button
                        onClick={onCartClick}
                        className="flex items-center gap-2 bg-accent/5 hover:bg-accent/10 border border-accent/20 px-3 py-2 rounded-lg transition-colors relative cursor-pointer"
                    >
                        <div className="relative">
                            <ShoppingCart size={20} className="text-accent" />
                            {itemCount > 0 && (
                                <span className="absolute -top-2 -right-2.5 bg-accent text-white text-[9px] font-bold rounded-full h-[18px] min-w-[18px] px-0.5 flex items-center justify-center border-2 border-white">
                                    {itemCount}
                                </span>
                            )}
                        </div>
                        <span className="text-sm font-semibold text-accent hidden sm:block">Giỏ hàng</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
