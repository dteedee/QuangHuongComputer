import { Package } from 'lucide-react';
import type { Product, ProductVariant } from '../../../api/catalog';
import { formatCurrency } from '../../../utils/format';

interface StepExchangePickerProps {
    query: string;
    setQuery: (v: string) => void;
    isSearching: boolean;
    results: Product[];
    exchangeProduct: Product | null;
    setExchangeProduct: (p: Product | null) => void;
    variants: ProductVariant[];
    variantId: string;
    setVariantId: (v: string) => void;
    priceDiff: number | null;
    description: string;
    setDescription: (v: string) => void;
}

export const StepExchangePicker = ({
    query, setQuery, isSearching, results, exchangeProduct, setExchangeProduct,
    variants, variantId, setVariantId, priceDiff, description, setDescription,
}: StepExchangePickerProps) => (
    <div>
        <h2 className="text-base font-bold text-gray-900 mb-3">Sản phẩm thay thế</h2>

        {!exchangeProduct ? (
            <>
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm sản phẩm muốn đổi..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-sm mb-3"
                />
                {isSearching && <div className="text-center py-4 text-sm text-gray-400">Đang tìm...</div>}
                {!isSearching && results.length > 0 && (
                    <div className="max-h-80 overflow-y-auto space-y-2">
                        {results.map((p) => (
                            <button
                                type="button"
                                key={p.id}
                                onClick={() => setExchangeProduct(p)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-accent hover:bg-red-50/40 text-left transition-all cursor-pointer"
                            >
                                <div className="w-12 h-12 bg-gray-50 rounded-lg flex-shrink-0 overflow-hidden">
                                    {p.imageUrl ? (
                                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Package className="w-full h-full p-2 text-gray-300" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                                    <p className="text-xs text-accent font-bold mt-0.5">{formatCurrency(p.priceFrom ?? p.price)}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                {!isSearching && query.length >= 2 && results.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-400">Không tìm thấy sản phẩm</div>
                )}
            </>
        ) : (
            <div className="p-4 rounded-xl border-2 border-accent bg-red-50/40">
                <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-white rounded-lg overflow-hidden flex-shrink-0">
                        {exchangeProduct.imageUrl ? (
                            <img src={exchangeProduct.imageUrl} alt={exchangeProduct.name} className="w-full h-full object-cover" />
                        ) : (
                            <Package className="w-full h-full p-3 text-gray-300" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">{exchangeProduct.name}</p>
                        <p className="text-sm text-accent font-bold mt-0.5">
                            {formatCurrency(exchangeProduct.priceFrom ?? exchangeProduct.price)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setExchangeProduct(null)}
                        className="text-xs text-gray-500 hover:text-accent underline cursor-pointer"
                    >
                        Đổi khác
                    </button>
                </div>

                {variants.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-red-100">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Biến thể</label>
                        <select
                            value={variantId}
                            onChange={(e) => setVariantId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        >
                            {variants.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.name} · {formatCurrency(v.price)}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {priceDiff != null && (
                    <div className="mt-3 pt-3 border-t border-red-100 flex items-center justify-between text-sm">
                        <span className="text-gray-700 font-medium">Chênh lệch dự kiến</span>
                        <span className={`font-bold ${priceDiff > 0 ? 'text-red-600' : priceDiff < 0 ? 'text-emerald-600' : 'text-gray-700'}`}>
                            {priceDiff > 0 ? `Bù thêm ${formatCurrency(priceDiff)}` : priceDiff < 0 ? `Hoàn ${formatCurrency(-priceDiff)}` : 'Bằng giá'}
                        </span>
                    </div>
                )}
            </div>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1.5 mt-4">Ghi chú</label>
        <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Lý do muốn đổi sang sản phẩm này..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none text-sm"
        />
    </div>
);

export default StepExchangePicker;
