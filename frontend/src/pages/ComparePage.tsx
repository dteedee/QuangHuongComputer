import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useComparison } from '../context/ComparisonContext';
import { catalogApi } from '../api/catalog';
import type {
    Product,
    ProductDetailBundle,
    SpecificationAttribute,
    SpecificationGroup,
    ProductSpecificationValue,
} from '../api/catalog';
import { formatCurrency } from '../utils/format';
import { ArrowLeft, Scale, X, ShoppingCart, Star, Check, Minus, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface ProductWithSpecs extends Product {
    specGroups?: SpecificationGroup[];
    specs?: ProductSpecificationValue[];
}

/** Định dạng giá trị spec theo dataType. */
function formatSpecValue(attr: SpecificationAttribute, value?: ProductSpecificationValue): string | null {
    if (!value) return null;
    switch (attr.dataType) {
        case 'Number':
            if (value.valueNumber == null) return null;
            return `${value.valueNumber}${attr.unit ? ` ${attr.unit}` : ''}`;
        case 'Boolean':
            if (value.valueBool == null) return null;
            return value.valueBool ? 'Có' : 'Không';
        default:
            return value.valueText ?? null;
    }
}

export function ComparePage() {
    const { items, removeFromComparison, clearComparison, addToComparison } = useComparison();
    const { addToCart } = useCart();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState<ProductWithSpecs[]>([]);
    const [loading, setLoading] = useState(true);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerCandidates, setPickerCandidates] = useState<Product[]>([]);
    const [pickerLoading, setPickerLoading] = useState(false);

    // Nếu URL có ?add=<productId>, tự động thêm vào so sánh 1 lần
    useEffect(() => {
        const addId = searchParams.get('add');
        if (!addId) return;
        (async () => {
            try {
                const p = await catalogApi.getProduct(addId);
                addToComparison(p);
            } catch { /* silent */ }
            const next = new URLSearchParams(searchParams);
            next.delete('add');
            setSearchParams(next, { replace: true });
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (items.length === 0) {
            navigate('/products');
            return;
        }
        loadProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items.length]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const loaded = await Promise.all(
                items.map(async (item) => {
                    try {
                        const bundle = await catalogApi.getProductWithDetails(item.id) as ProductDetailBundle;
                        return { ...bundle, specGroups: bundle.specGroups, specs: bundle.specs } as ProductWithSpecs;
                    } catch {
                        const base = await catalogApi.getProduct(item.id);
                        return { ...base } as ProductWithSpecs;
                    }
                })
            );
            setProducts(loaded);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = (product: Product) => addToCart(product, 1);

    // ============ Comparable attributes (unique across all products) ============
    const comparableGroups = useMemo(() => {
        const groupMap = new Map<string, { group: SpecificationGroup; attrs: SpecificationAttribute[] }>();
        const seenAttrIds = new Set<string>();

        products.forEach((p) => {
            (p.specGroups || []).forEach((g) => {
                const filtered = g.attributes.filter((a) => a.isComparable);
                if (filtered.length === 0) return;
                let entry = groupMap.get(g.id);
                if (!entry) {
                    entry = { group: g, attrs: [] };
                    groupMap.set(g.id, entry);
                }
                filtered.forEach((a) => {
                    if (!seenAttrIds.has(a.id)) {
                        entry!.attrs.push(a);
                        seenAttrIds.add(a.id);
                    }
                });
            });
        });
        return Array.from(groupMap.values());
    }, [products]);

    // Xác định ô "khác biệt" theo hàng (mọi giá trị không đồng nhất)
    const isRowDiverse = (attr: SpecificationAttribute): boolean => {
        const vals = products.map((p) => {
            const v = (p.specs || []).find((x) => x.attributeId === attr.id);
            return formatSpecValue(attr, v) ?? '';
        });
        return new Set(vals).size > 1;
    };

    const openPicker = async () => {
        if (products.length === 0) return;
        setPickerOpen(true);
        setPickerLoading(true);
        try {
            const catId = products[0].categoryId;
            const res = await catalogApi.getProducts({ categoryId: catId, pageSize: 20 });
            const existingIds = new Set(products.map((p) => p.id));
            setPickerCandidates((res.products || []).filter((p) => !existingIds.has(p.id)));
        } catch {
            setPickerCandidates([]);
        } finally {
            setPickerLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded-xl w-1/4 mb-8" />
                        <div className="grid grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-96 bg-gray-200 rounded-xl" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                    <div>
                        <Link
                            to="/products"
                            className="inline-flex items-center gap-2 text-gray-500 hover:text-accent transition-colors mb-2 text-sm cursor-pointer"
                        >
                            <ArrowLeft size={16} />
                            Tiếp tục mua sắm
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <Scale className="text-accent" size={24} />
                            So sánh sản phẩm ({products.length})
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        {products.length < 4 && (
                            <button
                                type="button"
                                onClick={openPicker}
                                className="inline-flex items-center gap-2 border border-accent text-accent px-4 py-2 rounded-xl hover:bg-red-50 transition-all text-sm font-semibold cursor-pointer"
                            >
                                <Plus size={16} /> Thêm sản phẩm
                            </button>
                        )}
                        <button
                            onClick={() => { clearComparison(); navigate('/products'); }}
                            className="border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-all text-sm font-semibold cursor-pointer"
                        >
                            Xóa tất cả
                        </button>
                    </div>
                </div>

                {/* Comparison Table */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="w-48 p-4 text-left text-sm font-semibold text-gray-500 bg-gray-50">Sản phẩm</th>
                                    {products.map((product) => (
                                        <th key={product.id} className="p-4 text-center min-w-[220px]">
                                            <div className="relative">
                                                <button
                                                    onClick={() => removeFromComparison(product.id)}
                                                    className="absolute -top-2 -right-2 p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-red-100 hover:text-accent transition-all cursor-pointer"
                                                    title="Xóa khỏi so sánh"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                                <Link to={`/san-pham/${product.slug || product.id}`}>
                                                    <div className="w-32 h-32 mx-auto mb-3 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
                                                        {product.imageUrl ? (
                                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <span className="text-gray-300 text-sm">Không có ảnh</span>
                                                        )}
                                                    </div>
                                                    <h3 className="font-semibold text-gray-800 hover:text-accent transition-colors line-clamp-2 text-sm">
                                                        {product.name}
                                                    </h3>
                                                </Link>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {/* Price row */}
                                <tr className="border-b border-gray-100 bg-red-50/40">
                                    <td className="p-4 text-sm font-semibold text-gray-700 bg-gray-50">Giá</td>
                                    {products.map((product) => (
                                        <td key={product.id} className="p-4 text-center">
                                            <div className="text-xl font-bold text-accent">
                                                {formatCurrency(product.priceFrom ?? product.price)}
                                            </div>
                                            {product.oldPrice && product.oldPrice > product.price && (
                                                <div className="text-sm text-gray-400 line-through">{formatCurrency(product.oldPrice)}</div>
                                            )}
                                        </td>
                                    ))}
                                </tr>

                                {/* Rating */}
                                <tr className="border-b border-gray-100">
                                    <td className="p-4 text-sm font-semibold text-gray-700 bg-gray-50">Đánh giá</td>
                                    {products.map((product) => (
                                        <td key={product.id} className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`w-4 h-4 ${i < Math.round(product.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                                                ))}
                                                <span className="ml-2 text-xs text-gray-500">({product.reviewCount})</span>
                                            </div>
                                        </td>
                                    ))}
                                </tr>

                                {/* Stock */}
                                <tr className="border-b border-gray-100">
                                    <td className="p-4 text-sm font-semibold text-gray-700 bg-gray-50">Tình trạng</td>
                                    {products.map((product) => (
                                        <td key={product.id} className="p-4 text-center">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${product.stockQuantity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {product.stockQuantity > 0 ? 'Còn hàng' : 'Hết hàng'}
                                            </span>
                                        </td>
                                    ))}
                                </tr>

                                {/* SKU */}
                                <tr className="border-b border-gray-100">
                                    <td className="p-4 text-sm font-semibold text-gray-700 bg-gray-50">SKU</td>
                                    {products.map((product) => (
                                        <td key={product.id} className="p-4 text-center text-sm text-gray-600">{product.sku || '-'}</td>
                                    ))}
                                </tr>

                                {/* Structured spec groups */}
                                {comparableGroups.length > 0 && comparableGroups.map(({ group, attrs }) => (
                                    <React.Fragment key={group.id}>
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            <td colSpan={products.length + 1} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide">
                                                {group.name}
                                            </td>
                                        </tr>
                                        {attrs.map((attr) => {
                                            const diverse = isRowDiverse(attr);
                                            return (
                                                <tr key={attr.id} className="border-b border-gray-100">
                                                    <td className="p-4 text-sm font-medium text-gray-700 bg-gray-50">
                                                        {attr.name}{attr.unit ? ` (${attr.unit})` : ''}
                                                    </td>
                                                    {products.map((product) => {
                                                        const v = (product.specs || []).find((x) => x.attributeId === attr.id);
                                                        const display = formatSpecValue(attr, v);
                                                        return (
                                                            <td
                                                                key={product.id}
                                                                className={`p-4 text-center text-sm text-gray-700 ${diverse ? 'bg-yellow-50' : ''}`}
                                                            >
                                                                {display || <Minus className="w-3 h-3 mx-auto text-gray-300" />}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}

                                {/* Warranty */}
                                <tr className="border-b border-gray-100">
                                    <td className="p-4 text-sm font-semibold text-gray-700 bg-gray-50">Bảo hành</td>
                                    {products.map((product) => (
                                        <td key={product.id} className="p-4 text-center text-sm text-gray-600">{product.warrantyInfo || '-'}</td>
                                    ))}
                                </tr>

                                {/* Add to cart */}
                                <tr className="bg-gray-50">
                                    <td className="p-4 bg-gray-50" />
                                    {products.map((product) => (
                                        <td key={product.id} className="p-4 text-center">
                                            <button
                                                onClick={() => handleAddToCart(product)}
                                                disabled={product.stockQuantity === 0}
                                                className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer text-sm px-3"
                                            >
                                                <ShoppingCart size={16} />
                                                Thêm vào giỏ
                                            </button>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Summary */}
                {products.length >= 2 && (
                    <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Tóm tắt so sánh</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <p className="text-xs font-semibold text-emerald-700 uppercase mb-2">Giá tốt nhất</p>
                                {(() => {
                                    const cheapest = products.reduce((min, p) => p.price < min.price ? p : min);
                                    return (
                                        <div className="flex items-center gap-2">
                                            <Check className="text-emerald-600 flex-shrink-0" size={16} />
                                            <span className="font-medium text-gray-800 text-sm truncate">{cheapest.name}</span>
                                            <span className="ml-auto text-emerald-700 font-bold text-sm whitespace-nowrap">{formatCurrency(cheapest.price)}</span>
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                                <p className="text-xs font-semibold text-yellow-700 uppercase mb-2">Đánh giá cao nhất</p>
                                {(() => {
                                    const bestRated = products.reduce((max, p) => p.averageRating > max.averageRating ? p : max);
                                    return (
                                        <div className="flex items-center gap-2">
                                            <Star className="text-yellow-500 flex-shrink-0 fill-yellow-500" size={16} />
                                            <span className="font-medium text-gray-800 text-sm truncate">{bestRated.name}</span>
                                            <span className="ml-auto text-yellow-700 font-bold text-sm">{bestRated.averageRating.toFixed(1)}</span>
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Bán chạy nhất</p>
                                {(() => {
                                    const mostPopular = products.reduce((max, p) => p.soldCount > max.soldCount ? p : max);
                                    return (
                                        <div className="flex items-center gap-2">
                                            <ShoppingCart className="text-blue-600 flex-shrink-0" size={16} />
                                            <span className="font-medium text-gray-800 text-sm truncate">{mostPopular.name}</span>
                                            <span className="ml-auto text-blue-700 font-bold text-sm whitespace-nowrap">{mostPopular.soldCount} đã bán</span>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* Product picker modal */}
                {pickerOpen && (
                    <div
                        className="fixed inset-0 z-[150] bg-black/50 flex items-center justify-center p-4"
                        onClick={() => setPickerOpen(false)}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
                        >
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="font-bold text-gray-900">Chọn sản phẩm để so sánh</h3>
                                <button onClick={() => setPickerOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto space-y-2">
                                {pickerLoading ? (
                                    <p className="text-center text-sm text-gray-500 py-6">Đang tải...</p>
                                ) : pickerCandidates.length === 0 ? (
                                    <p className="text-center text-sm text-gray-500 py-6">Không có sản phẩm cùng danh mục.</p>
                                ) : (
                                    pickerCandidates.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                addToComparison(p);
                                                setPickerOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:border-accent hover:bg-red-50/40 transition-colors text-left cursor-pointer"
                                        >
                                            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {p.imageUrl ? (
                                                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <span className="text-gray-300 text-xs font-bold">{p.name?.charAt(0) || '?'}</span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                                                <p className="text-xs text-accent font-bold">{formatCurrency(p.price)}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ComparePage;
