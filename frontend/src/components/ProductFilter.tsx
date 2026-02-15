import { useState } from 'react';
import { Filter, ChevronDown, ChevronUp, Check, RotateCcw } from 'lucide-react';
import type { Category, Brand } from '../api/catalog';

interface ProductFilterProps {
    categories: Category[];
    brands: Brand[];
    selectedCategory: string;
    selectedBrand: string;
    priceRange: { min: number; max: number };
    inStockOnly: boolean;
    onCategoryChange: (id: string) => void;
    onBrandChange: (id: string) => void;
    onPriceChange: (range: { min: number; max: number }) => void;
    onInStockChange: (checked: boolean) => void;
    onReset: () => void;
}

const FilterSection = ({
    title,
    children,
    isOpenDefault = true
}: {
    title: string;
    children: React.ReactNode;
    isOpenDefault?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(isOpenDefault);

    return (
        <div className="border-b border-gray-100 py-4 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full mb-3 group"
            >
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide group-hover:text-[#D70018] transition-colors">{title}</h3>
                {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            <div className={`space-y-2 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {children}
            </div>
        </div>
    );
};

export const ProductFilter = ({
    categories,
    brands,
    selectedCategory,
    selectedBrand,
    priceRange,
    inStockOnly,
    onCategoryChange,
    onBrandChange,
    onPriceChange,
    onInStockChange,
    onReset
}: ProductFilterProps) => {
    const [localMinPrice, setLocalMinPrice] = useState(priceRange.min);
    const [localMaxPrice, setLocalMaxPrice] = useState(priceRange.max);

    const handlePriceApply = () => {
        onPriceChange({ min: localMinPrice, max: localMaxPrice });
    };

    return (
        <aside className="w-full lg:w-64 flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-fit sticky top-20">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                    <Filter className="w-5 h-5 text-[#D70018]" />
                    Bộ lọc
                </h2>
                <button
                    onClick={onReset}
                    className="text-xs font-medium text-gray-500 hover:text-[#D70018] flex items-center gap-1 transition-colors"
                >
                    <RotateCcw size={12} />
                    Đặt lại
                </button>
            </div>

            <FilterSection title="Danh mục">
                <label className="flex items-center gap-3 cursor-pointer group p-1 rounded hover:bg-gray-50 transition-colors">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedCategory === '' ? 'bg-[#D70018] border-[#D70018]' : 'border-gray-300 bg-white'}`}>
                        {selectedCategory === '' && <Check size={12} className="text-white" />}
                    </div>
                    <input
                        type="radio"
                        name="category"
                        className="hidden"
                        checked={selectedCategory === ''}
                        onChange={() => onCategoryChange('')}
                    />
                    <span className={`text-sm font-medium ${selectedCategory === '' ? 'text-[#D70018]' : 'text-gray-600 group-hover:text-gray-900'}`}>Tất cả</span>
                </label>
                {categories.map((category) => (
                    <label key={category.id} className="flex items-center gap-3 cursor-pointer group p-1 rounded hover:bg-gray-50 transition-colors">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedCategory === category.id ? 'bg-[#D70018] border-[#D70018]' : 'border-gray-300 bg-white'}`}>
                            {selectedCategory === category.id && <Check size={12} className="text-white" />}
                        </div>
                        <input
                            type="radio"
                            name="category"
                            className="hidden"
                            checked={selectedCategory === category.id}
                            onChange={() => onCategoryChange(category.id)}
                        />
                        <span className={`text-sm font-medium ${selectedCategory === category.id ? 'text-[#D70018]' : 'text-gray-600 group-hover:text-gray-900'}`}>
                            {category.name}
                        </span>
                    </label>
                ))}
            </FilterSection>

            <FilterSection title="Thương hiệu">
                <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    <label className="flex items-center gap-3 cursor-pointer group p-1 rounded hover:bg-gray-50 transition-colors">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedBrand === '' ? 'bg-[#D70018] border-[#D70018]' : 'border-gray-300 bg-white'}`}>
                            {selectedBrand === '' && <Check size={12} className="text-white" />}
                        </div>
                        <input
                            type="radio"
                            name="brand"
                            className="hidden"
                            checked={selectedBrand === ''}
                            onChange={() => onBrandChange('')}
                        />
                        <span className={`text-sm font-medium ${selectedBrand === '' ? 'text-[#D70018]' : 'text-gray-600 group-hover:text-gray-900'}`}>Tất cả</span>
                    </label>
                    {brands.map((brand) => (
                        <label key={brand.id} className="flex items-center gap-3 cursor-pointer group p-1 rounded hover:bg-gray-50 transition-colors">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedBrand === brand.id ? 'bg-[#D70018] border-[#D70018]' : 'border-gray-300 bg-white'}`}>
                                {selectedBrand === brand.id && <Check size={12} className="text-white" />}
                            </div>
                            <input
                                type="radio"
                                name="brand"
                                className="hidden"
                                checked={selectedBrand === brand.id}
                                onChange={() => onBrandChange(brand.id)}
                            />
                            <span className={`text-sm font-medium ${selectedBrand === brand.id ? 'text-[#D70018]' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                {brand.name}
                            </span>
                        </label>
                    ))}
                </div>
            </FilterSection>

            <FilterSection title="Khoảng giá">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={localMinPrice || ''}
                            onChange={(e) => setLocalMinPrice(Number(e.target.value))}
                            placeholder="0"
                            className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D70018]/20 focus:border-[#D70018] outline-none transition-all placeholder:text-gray-400"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="number"
                            value={localMaxPrice >= 100000000 ? '' : localMaxPrice}
                            onChange={(e) => setLocalMaxPrice(Number(e.target.value))}
                            placeholder="Tối đa"
                            className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#D70018]/20 focus:border-[#D70018] outline-none transition-all placeholder:text-gray-400"
                        />
                    </div>
                    <button
                        onClick={handlePriceApply}
                        className="w-full py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-lg hover:bg-[#D70018] hover:text-white transition-all"
                    >
                        Áp dụng
                    </button>
                </div>
            </FilterSection>

            <div className="pt-4 mt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${inStockOnly ? 'bg-[#D70018]' : 'bg-gray-200'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-300 ${inStockOnly ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <input
                        type="checkbox"
                        className="hidden"
                        checked={inStockOnly}
                        onChange={(e) => onInStockChange(e.target.checked)}
                    />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Chỉ hiện hàng có sẵn</span>
                </label>
            </div>

        </aside>
    );
};
