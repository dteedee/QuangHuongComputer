
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { catalogApi, type Product } from '../api/catalog';
import { useCart } from '../context/CartContext';
import { ArrowLeft, ShoppingBag, Package, Tag, ShieldCheck } from 'lucide-react';

export const ProductDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToCart } = useCart();

    const [product, setProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;
        const fetchProduct = async () => {
            try {
                setIsLoading(true);
                const data = await catalogApi.getProduct(id);
                setProduct(data);
            } catch (err) {
                console.error(err);
                setError('Failed to load product details.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    if (isLoading) return (
        <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );

    if (error || !product) return (
        <div className="text-center py-20">
            <h2 className="text-2xl text-red-400 mb-4">{error || 'Product not found'}</h2>
            <button onClick={() => navigate('/')} className="text-blue-400 hover:underline">
                Back to Store
            </button>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-12">
            <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-400 hover:text-white mb-8 transition group"
            >
                <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition" />
                Back to Products
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Product Image Placeholder */}
                <div className="bg-gray-800 rounded-3xl h-[400px] md:h-[500px] w-full flex items-center justify-center p-8 border border-white/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 opacity-50 group-hover:opacity-100 transition duration-500"></div>
                    <ShoppingBag className="w-32 h-32 text-gray-600 group-hover:scale-110 transition duration-500" />
                </div>

                {/* Info */}
                <div className="flex flex-col justify-center">
                    <div className="mb-4">
                        <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold tracking-wide uppercase mb-4">
                            Premium Product
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                            {product.name}
                        </h1>
                    </div>

                    <div className="flex items-center gap-6 mb-8">
                        <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                            ${product.price.toLocaleString()}
                        </span>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${product.stockQuantity > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                            <Package className="w-4 h-4" />
                            {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
                        </div>
                    </div>

                    <p className="text-gray-400 text-lg leading-relaxed mb-8 border-b border-white/10 pb-8">
                        {product.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <Tag className="w-6 h-6 text-blue-400 mb-2" />
                            <h4 className="text-white font-semibold">Best Value</h4>
                            <p className="text-gray-500 text-sm">Competitive pricing</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <ShieldCheck className="w-6 h-6 text-blue-400 mb-2" />
                            <h4 className="text-white font-semibold">Warranty</h4>
                            <p className="text-gray-500 text-sm">1 Year Included</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => addToCart(product)}
                            disabled={product.stockQuantity === 0}
                            className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                        >
                            <ShoppingBag className="w-5 h-5" />
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
