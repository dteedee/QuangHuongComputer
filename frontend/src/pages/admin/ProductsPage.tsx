import { useState } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../../api/catalog';

// Product type is inferred from API response now, or we can import it.
// To avoid conflicts if I use explicit type, I'll rely on inference or import generic Product from catalog.

export const AdminProductsPage = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: response, isLoading } = useQuery({
        queryKey: ['admin-products'],
        queryFn: () => catalogApi.getProducts(),
    });

    // The API returns { products: [], total, ... }
    const products = response?.products || [];

    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Products</h1>
                    <p className="text-gray-400">Manage your product catalog</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                    <Plus size={20} />
                    Add Product
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Products Table */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Name</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Category</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Price</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Stock</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading...</td>
                            </tr>
                        ) : filteredProducts?.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No products found</td>
                            </tr>
                        ) : (
                            filteredProducts?.map((product) => (
                                <tr key={product.id} className="border-t border-white/10 hover:bg-white/5 transition">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="text-white font-medium">{product.name}</p>
                                            <p className="text-sm text-gray-400 truncate max-w-xs">{product.description}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-300">{product.categoryId}</td>
                                    <td className="px-6 py-4 text-white font-medium">₫{product.price.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs ${product.stockQuantity > 10
                                            ? 'bg-green-500/20 text-green-400'
                                            : product.stockQuantity > 0
                                                ? 'bg-yellow-500/20 text-yellow-400'
                                                : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {product.stockQuantity} units
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition">
                                                <Edit size={18} />
                                            </button>
                                            <button className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
