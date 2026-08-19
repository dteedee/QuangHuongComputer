import { Link } from 'react-router-dom';
import { Search, Menu as MenuIcon, ChevronDown } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import type { Category } from '../../api/catalog';

interface HeaderSearchPillProps {
    categories: Category[];
    onSubmit: (query: string) => void;
}

/**
 * Search bar bo tròn viền đỏ 2px (radius full) theo hacom.vn: dropdown "Danh mục" + input + nút kính lúp đỏ.
 */
export const HeaderSearchPill = ({ categories, onSubmit }: HeaderSearchPillProps) => {
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            onSubmit(searchQuery.trim());
            setSearchQuery('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex h-10 rounded-full border-2 border-accent overflow-hidden">
            <div className="relative" ref={categoryMenuRef}>
                <button
                    type="button"
                    onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                    className="h-full pl-4 pr-3 flex items-center gap-1 bg-gray-50 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                    Danh mục <ChevronDown size={13} className={`transition-transform duration-200 ${showCategoryMenu ? 'rotate-180' : ''}`} />
                </button>
                {showCategoryMenu && (
                    <div className="absolute top-full left-0 mt-1 w-60 bg-white rounded-lg shadow-large border border-gray-100 py-1 z-[100] max-h-72 overflow-y-auto animate-scale-in">
                        <Link
                            to="/products"
                            onClick={() => setShowCategoryMenu(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 font-medium border-b border-gray-50 cursor-pointer"
                        >
                            <MenuIcon size={15} className="text-accent" />
                            Tất cả sản phẩm
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
                            <div className="px-4 py-3 text-sm text-gray-400 text-center">Đang tải...</div>
                        )}
                    </div>
                )}
            </div>
            <input
                type="text"
                placeholder="Tìm laptop, PC, linh kiện..."
                className="flex-1 px-4 bg-white text-gray-900 text-sm border-x border-gray-200 focus:outline-none placeholder:text-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
                type="submit"
                className="bg-accent text-white px-5 hover:bg-accent-hover transition-colors cursor-pointer"
                aria-label="Tìm kiếm"
            >
                <Search size={18} />
            </button>
        </form>
    );
};
