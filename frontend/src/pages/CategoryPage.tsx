import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { catalogApi, type Product } from '../api/catalog';
import { ProductCard } from '../components/ProductCard';
import { Monitor, Filter, ArrowDownWideNarrow } from 'lucide-react';
import { motion } from 'framer-motion';

export const CategoryPage = () => {
    // In a real app, 'slug' would map to a category ID. 
    // For now, we'll pretend all categories show all products or filter client-side mock.
    const { slug } = useParams<{ slug: string }>();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const categoryNames: Record<string, string> = {
        'laptop': 'Laptop - Máy tính xách tay',
        'pc-gaming': 'PC Gaming - Máy tính chơi game',
        'workstation': 'PC Workstation - Máy tính đồ họa',
        'office': 'Máy tính văn phòng',
        'components': 'Linh kiện máy tính',
        'screens': 'Màn hình máy tính'
    };

    const title = categoryNames[slug || ''] || 'Sản phẩm';

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                // In real implementation: await catalogApi.getProductsByCategory(categoryId);
                const data = await catalogApi.getProducts();
                setProducts(data.products);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProducts();
    }, [slug]);

    return (
        <div className="bg-gray-100 min-h-screen pb-10">
            {/* Breadcrumb */}
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="container mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-[#D70018]">Trang chủ</Link>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">{title}</span>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-6">
                {/* Header Banner */}
                <div className="bg-white p-4 rounded-md shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-[#D70018]">
                            <Monitor size={32} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 uppercase">{title}</h1>
                            <p className="text-sm text-gray-500">Tìm thấy {products.length} sản phẩm</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar Filters */}
                    <div className="hidden lg:block space-y-4">
                        <div className="bg-white p-4 rounded-md shadow-sm">
                            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                                <Filter size={16} /> BỘ LỌC TÌM KIẾM
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase">Thương hiệu</h4>
                                    <div className="flex flex-col gap-2 text-sm text-gray-600">
                                        <label className="flex items-center gap-2"><input type="checkbox" /> Asus</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" /> Dell</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" /> HP</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" /> MSI</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" /> Lenovo</label>
                                    </div>
                                </div>
                                <hr className="border-gray-100" />
                                <div>
                                    <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase">Mức giá</h4>
                                    <div className="flex flex-col gap-2 text-sm text-gray-600">
                                        <label className="flex items-center gap-2"><input type="checkbox" /> Dưới 10 triệu</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" /> 10 - 15 triệu</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" /> 15 - 20 triệu</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" /> Trên 20 triệu</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Products Grid */}
                    <div className="lg:col-span-3">
                        {/* Sort Bar */}
                        <div className="bg-white p-2 rounded-md shadow-sm mb-4 flex justify-end items-center gap-2">
                            <span className="text-sm text-gray-500">Sắp xếp theo:</span>
                            <div className="flex items-center gap-1 border border-gray-300 px-3 py-1.5 rounded text-sm cursor-pointer hover:border-[#D70018]">
                                <ArrowDownWideNarrow size={14} />
                                <span>Mới nhất</span>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                    <div key={i} className="bg-white h-[300px] rounded animate-pulse"></div>
                                ))}
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
                            >
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
