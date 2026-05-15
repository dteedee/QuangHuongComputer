import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import {
    Search, ShoppingCart, Menu as MenuIcon, ChevronDown,
    MessageCircle
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Category } from '../../api/catalog';

interface HeaderMainBarProps {
    isScrolled: boolean;
    companyBrand1: string;
    companyBrand2: string;
    categories: Category[];
    onCartClick: () => void;
    onChatClick?: () => void;
    onMobileMenuOpen: () => void;
}

export const HeaderMainBar = ({
    isScrolled, companyBrand1, companyBrand2,
    categories, onCartClick, onChatClick, onMobileMenuOpen
}: HeaderMainBarProps) => {
    const navigate = useNavigate();
    const { itemCount } = useCart();
    const [searchQuery, setSearchQuery] = useState('');
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);
    const categoryMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
                setShowCategoryMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
            setSearchQuery('');
        }
    };

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
                <Link to="/" className="flex-shrink-0 flex items-center gap-2.5 group">
                    <div className={`bg-accent rounded-lg flex items-center justify-center text-white font-black shadow-md group-hover:shadow-brand transition-all duration-200 ${isScrolled ? 'w-9 h-9 text-lg' : 'w-11 h-11 text-xl'}`}>
                        QH
                    </div>
                    <div className="hidden sm:flex flex-col">
                        <span className={`font-black text-accent uppercase tracking-tight leading-none transition-all duration-200 ${isScrolled ? 'text-base' : 'text-lg'}`}>
                            {companyBrand1}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 tracking-[0.15em] uppercase mt-0.5">
                            {companyBrand2}
                        </span>
                    </div>
                </Link>

                {/* Search bar - desktop */}
                <div className="flex-1 max-w-2xl hidden md:block">
                    <form onSubmit={handleSearch} className="flex h-10">
                        <div className="relative" ref={categoryMenuRef}>
                            <button
                                type="button"
                                onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                                className="h-full px-3.5 flex items-center gap-1 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                Danh muc <ChevronDown size={13} className={`transition-transform duration-200 ${showCategoryMenu ? 'rotate-180' : ''}`} />
                            </button>
                            {showCategoryMenu && (
                                <div className="absolute top-full left-0 mt-1 w-60 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-[100] max-h-72 overflow-y-auto animate-scale-in">
                                    <Link
                                        to="/products"
                                        onClick={() => setShowCategoryMenu(false)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 font-medium border-b border-gray-50 cursor-pointer"
                                    >
                                        <MenuIcon size={15} className="text-accent" />
                                        Tat ca san pham
                                    </Link>
                                    {categories.map((cat) => (
                                        <Link
                                            key={cat.id}
                                            to={`/products?categoryId=${cat.id}`}
                                            onClick={() => setShowCategoryMenu(false)}
                                            className="flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 text-gray-600 hover:text-accent transition-colors cursor-pointer"
                                        >
                                            <span>{cat.name}</span>
                                            {cat.productCount !== undefined && cat.productCount > 0 && (
                                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                                    {cat.productCount}
                                                </span>
                                            )}
                                        </Link>
                                    ))}
                                    {categories.length === 0 && (
                                        <div className="px-4 py-3 text-sm text-gray-400 text-center">Dang tai...</div>
                                    )}
                                </div>
                            )}
                        </div>
                        <input
                            type="text"
                            placeholder="Tim laptop, PC, linh kien..."
                            className="flex-1 px-4 bg-white text-gray-900 text-sm border border-gray-200 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all placeholder:text-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="bg-accent text-white px-5 rounded-r-lg hover:bg-accent-hover transition-colors cursor-pointer"
                        >
                            <Search size={18} />
                        </button>
                    </form>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0 ml-auto">
                    {/* Mobile search */}
                    <button
                        onClick={() => navigate('/products?q=')}
                        className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-accent transition-colors cursor-pointer"
                        aria-label="Tim kiem"
                    >
                        <Search size={20} />
                    </button>

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
                        <span className="text-sm font-semibold text-accent hidden sm:block">Gio hang</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
