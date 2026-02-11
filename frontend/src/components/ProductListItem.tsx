import { Link } from 'react-router-dom';
import { ShoppingCart, Star, PackageCheck, Truck } from 'lucide-react';
import type { Product } from '../api/catalog';
import { formatCurrency } from '../utils/format';
import { useCart } from '../context/CartContext';

interface ProductListItemProps {
    product: Product;
}

export const ProductListItem = ({ product }: ProductListItemProps) => {
    const { addToCart } = useCart();

    const discount = product.oldPrice && product.oldPrice > product.price
        ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
        : null;

    return (
        <div className="group bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all p-4 flex flex-col sm:flex-row gap-6">
            {/* Image */}
            <div className="relative w-full sm:w-56 h-56 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                <Link to={`/product/${product.id}`} className="block w-full h-full flex items-center justify-center p-4">
                    {product.imageUrl ? (
                        <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="text-gray-300 font-bold text-4xl select-none">
                            {product.name.charAt(0)}
                        </div>
                    )}
                </Link>

                {discount && (
                    <div className="absolute top-2 left-2 bg-[#D70018] text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                        -{discount}%
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">
                                {product.sku || 'N/A'}
                            </span>
                            <div className="flex items-center gap-0.5 text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={10} fill={i < (product.averageRating || 5) ? "currentColor" : "none"} className={i >= (product.averageRating || 5) ? "text-gray-300" : ""} />
                                ))}
                                <span className="text-gray-400 ml-1">({product.reviewCount || 0})</span>
                            </div>
                        </div>

                        <Link to={`/product/${product.id}`} className="block">
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#D70018] transition-colors leading-tight">
                                {product.name}
                            </h3>
                        </Link>

                        <div className="text-sm text-gray-500 line-clamp-2">
                            {product.description}
                        </div>

                        {/* Tech specs preview if available */}
                        {product.specifications && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {/* Just a mock or parsing minimal specs if needed. For now hiding to keep clean or showing a few badges */}
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-50 text-xs text-gray-600 border border-gray-100">
                                    <Truck size={12} /> Miễn phí vận chuyển
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-[#D70018] leading-none">
                            {formatCurrency(product.price)}
                        </div>
                        {product.oldPrice && (
                            <div className="text-sm text-gray-400 line-through mt-1">
                                {formatCurrency(product.oldPrice)}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50">
                    <div className={`flex items-center gap-1.5 text-sm font-medium ${product.stockQuantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        <PackageCheck size={16} />
                        {product.stockQuantity > 0 ? 'Còn hàng' : 'Hết hàng'}
                    </div>

                    <div className="flex gap-3">
                        <Link
                            to={`/product/${product.id}`}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
                        >
                            Xem chi tiết
                        </Link>
                        <button
                            onClick={() => addToCart(product)}
                            disabled={product.stockQuantity === 0}
                            className="px-4 py-2 bg-[#D70018] text-white rounded-lg text-sm font-bold hover:bg-[#b5001a] transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ShoppingCart size={16} />
                            Thêm vào giỏ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
