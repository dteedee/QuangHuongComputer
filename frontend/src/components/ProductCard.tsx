import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import type { Product } from '../hooks/useProducts';
import { ShoppingBag, Check } from 'lucide-react';

interface ProductCardProps {
    product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
    const { addToCart } = useCart();
    // Calculate mock discount
    const oldPrice = product.price * 1.15;
    const discount = Math.round(((oldPrice - product.price) / oldPrice) * 100);

    return (
        <div className="group bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-[0_0_10px_rgba(0,0,0,0.15)] hover:border-gray-300 transition-all duration-200 flex flex-col h-full relative cursor-pointer">
            {/* Discount Badge */}
            <div className="absolute top-0 left-0 bg-[#D70018] text-white text-[11px] font-bold px-2 py-1 z-10 rounded-br-md">
                GIẢM {discount}%
            </div>

            {/* Product Image */}
            <Link to={`/product/${product.id}`} className="block relative pt-[90%] bg-white p-2 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center p-4">
                    {/* Placeholder or Image */}
                    <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300 font-bold text-3xl group-hover:scale-105 transition-transform duration-300 rounded">
                        {product.name.substring(0, 1).toUpperCase()}
                    </div>
                </div>
            </Link>

            <div className="p-3 flex flex-col flex-1">
                {/* Product Name */}
                <Link to={`/product/${product.id}`} className="mb-2 block">
                    <h3 className="text-[13px] md:text-[14px] font-medium text-gray-800 line-clamp-2 min-h-[40px] group-hover:text-[#D70018] transition leading-snug">
                        {product.name}
                    </h3>
                </Link>

                {/* Specs / Status */}
                <div className="mb-2">
                    <div className="flex items-center gap-1 text-[10px] text-[#27ae60] bg-[#eafaf1] w-fit px-2 py-0.5 rounded border border-[#27ae60]">
                        <Check size={10} strokeWidth={3} />
                        <span className="font-bold">Còn hàng</span>
                    </div>
                </div>

                <div className="mt-auto">
                    {/* Prices */}
                    <div className="flex flex-col items-start">
                        <span className="text-[11px] text-gray-400 line-through">
                            {oldPrice.toLocaleString()} đ
                        </span>
                        <span className="text-[15px] md:text-[16px] xl:text-[18px] font-bold text-[#D70018]">
                            {product.price.toLocaleString()} đ
                        </span>
                    </div>

                    {/* Hover Action */}
                    <div className="mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2 left-2 right-2 flex gap-1">
                        <button
                            onClick={(e) => { e.preventDefault(); /* Buy now logic */ }}
                            className="flex-1 bg-[#D70018] text-white text-[11px] font-bold py-1.5 rounded hover:bg-red-700 transition"
                        >
                            MUA NGAY
                        </button>
                        <button
                            onClick={(e) => { e.preventDefault(); addToCart(product); }}
                            className="w-8 flex-shrink-0 bg-blue-600 text-white rounded flex items-center justify-center hover:bg-blue-700"
                        >
                            <ShoppingBag size={12} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
