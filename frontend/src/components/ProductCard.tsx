import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import type { Product } from '../hooks/useProducts';

interface ProductCardProps {
    product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
    const { addToCart } = useCart();

    return (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 flex flex-col">
            <Link to={`/product/${product.id}`} className="p-6 flex-1 block group-hover:no-underline">
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1 group-hover:text-blue-400 transition">{product.name}</h3>
                <div className="flex justify-between items-center mb-3">
                    <span className="text-2xl font-bold text-blue-400">${product.price.toLocaleString()}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${product.stockQuantity > 0
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                        }`}>
                        {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
                    </span>
                </div>
                <p className="text-gray-400 text-sm line-clamp-2">{product.description}</p>
            </Link>
            <div className="p-4 border-t border-white/10">
                <button
                    onClick={() => addToCart(product)}
                    disabled={product.stockQuantity === 0}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Add to Cart
                </button>
            </div>
        </div>
    );
};
