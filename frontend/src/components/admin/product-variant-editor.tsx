import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Layers, RefreshCw, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogApi, type ProductOptionType, type ProductVariant } from '../../api/catalog';

interface ProductVariantEditorProps {
    productId: string;
}

const MATRIX_WARNING_THRESHOLD = 50;

/** Editor biến thể: chọn OptionType → sinh ma trận → sửa Price/SKU/Stock hàng loạt. */
export default function ProductVariantEditor({ productId }: ProductVariantEditorProps) {
    const [optionTypes, setOptionTypes] = useState<ProductOptionType[]>([]);
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);

    // Ước lượng số biến thể sẽ sinh ra
    const projectedMatrixSize = useMemo(() => {
        if (selectedTypeIds.length === 0) return 0;
        return optionTypes
            .filter((t) => selectedTypeIds.includes(t.id))
            .reduce((acc, t) => acc * Math.max(1, t.values.length), 1);
    }, [selectedTypeIds, optionTypes]);

    const load = async () => {
        setLoading(true);
        try {
            const [types, existing] = await Promise.all([
                catalogApi.getOptionTypes(),
                catalogApi.getVariants(productId).catch(() => [] as ProductVariant[]),
            ]);
            setOptionTypes(Array.isArray(types) ? types : []);
            setVariants(existing);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [productId]);

    const toggleType = (id: string) => {
        setSelectedTypeIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };

    const generateMatrix = async () => {
        if (selectedTypeIds.length === 0) { toast.error('Chọn ít nhất 1 loại tuỳ chọn.'); return; }
        if (projectedMatrixSize > MATRIX_WARNING_THRESHOLD) {
            toast.error(`Ma trận sẽ có ${projectedMatrixSize} biến thể — vượt ngưỡng ${MATRIX_WARNING_THRESHOLD}. Hãy giảm loại/giá trị.`);
            return;
        }
        try {
            const created = await catalogApi.createVariantMatrix(productId, selectedTypeIds);
            setVariants(Array.isArray(created) ? created : variants);
            toast.success(`Đã sinh ${created.length} biến thể.`);
        } catch {
            toast.error('Không sinh được ma trận.');
        }
    };

    const updateField = (id: string, field: keyof ProductVariant, value: unknown) => {
        setVariants((prev) => prev.map((v) => v.id === id ? { ...v, [field]: value } as ProductVariant : v));
    };

    const saveRow = async (v: ProductVariant) => {
        setSavingId(v.id);
        try {
            await catalogApi.updateVariant(productId, v.id, {
                sku: v.sku, name: v.name, price: v.price, oldPrice: v.oldPrice,
                costPrice: v.costPrice, stockQuantity: v.stockQuantity, barcode: v.barcode,
                isDefault: v.isDefault, status: v.status, sortOrder: v.sortOrder,
            });
            toast.success(`Đã lưu ${v.sku}.`);
        } catch {
            toast.error('Lưu thất bại.');
        } finally {
            setSavingId(null);
        }
    };

    const deleteVariant = async (v: ProductVariant) => {
        if (!confirm(`Xoá biến thể ${v.sku}?`)) return;
        try {
            await catalogApi.deleteVariant(productId, v.id);
            setVariants((prev) => prev.filter((x) => x.id !== v.id));
            toast.success('Đã xoá.');
        } catch {
            toast.error('Xoá thất bại.');
        }
    };

    return (
        <div className="space-y-5">
            {/* Chọn loại tuỳ chọn để sinh ma trận */}
            <section className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4 text-[var(--accent-primary)]" />
                    <h4 className="text-sm font-bold text-gray-900">Chọn loại tuỳ chọn để sinh biến thể</h4>
                </div>
                {loading ? (
                    <p className="text-xs text-gray-400 italic">Đang tải...</p>
                ) : optionTypes.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Chưa có OptionType nào. Admin cần seed dữ liệu trước.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {optionTypes.map((t) => {
                            const active = selectedTypeIds.includes(t.id);
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => toggleType(t.id)}
                                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors cursor-pointer ${
                                        active
                                            ? 'border-[var(--accent-primary)] bg-red-50 text-[var(--accent-primary)] font-semibold'
                                            : 'border-gray-200 text-gray-700 hover:border-gray-400'
                                    }`}
                                >
                                    {t.displayName} <span className="text-xs text-gray-400">({t.values.length})</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {projectedMatrixSize > 0 && (
                    <div className={`mt-3 flex items-center gap-2 text-xs rounded-lg p-2 ${
                        projectedMatrixSize > MATRIX_WARNING_THRESHOLD ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                        {projectedMatrixSize > MATRIX_WARNING_THRESHOLD && <AlertTriangle className="w-3.5 h-3.5" />}
                        Ma trận dự kiến: {projectedMatrixSize} biến thể
                        {projectedMatrixSize > MATRIX_WARNING_THRESHOLD && ` — vượt ngưỡng cho phép (${MATRIX_WARNING_THRESHOLD}).`}
                    </div>
                )}

                <div className="mt-3">
                    <button
                        type="button"
                        onClick={generateMatrix}
                        disabled={selectedTypeIds.length === 0 || projectedMatrixSize > MATRIX_WARNING_THRESHOLD}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Sinh ma trận biến thể
                    </button>
                </div>
            </section>

            {/* Bảng biến thể */}
            <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900">
                        Danh sách biến thể ({variants.length})
                    </h4>
                </div>
                {variants.length === 0 ? (
                    <p className="p-6 text-sm text-gray-500 italic text-center">Chưa có biến thể. Sinh ma trận ở trên để bắt đầu.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="p-3 text-left">Tổ hợp</th>
                                    <th className="p-3 text-left">SKU</th>
                                    <th className="p-3 text-right">Giá</th>
                                    <th className="p-3 text-right">Giá gốc</th>
                                    <th className="p-3 text-right">Tồn</th>
                                    <th className="p-3 text-center">Trạng thái</th>
                                    <th className="p-3 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {variants.map((v) => (
                                    <tr key={v.id} className="border-t border-gray-100">
                                        <td className="p-3 min-w-[180px]">
                                            <div className="flex flex-wrap gap-1">
                                                {v.options.map((o) => (
                                                    <span key={o.optionTypeId} className="text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                                                        {o.typeName}: {o.valueDisplay}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <input
                                                value={v.sku}
                                                onChange={(e) => updateField(v.id, 'sku', e.target.value)}
                                                className="w-32 px-2 py-1 border border-gray-200 rounded"
                                            />
                                        </td>
                                        <td className="p-3 text-right">
                                            <input
                                                type="number"
                                                value={v.price}
                                                onChange={(e) => updateField(v.id, 'price', Number(e.target.value))}
                                                className="w-28 px-2 py-1 border border-gray-200 rounded text-right"
                                            />
                                        </td>
                                        <td className="p-3 text-right">
                                            <input
                                                type="number"
                                                value={v.oldPrice ?? ''}
                                                onChange={(e) => updateField(v.id, 'oldPrice', e.target.value ? Number(e.target.value) : undefined)}
                                                className="w-28 px-2 py-1 border border-gray-200 rounded text-right"
                                            />
                                        </td>
                                        <td className="p-3 text-right">
                                            <input
                                                type="number"
                                                value={v.stockQuantity}
                                                onChange={(e) => updateField(v.id, 'stockQuantity', Number(e.target.value))}
                                                className="w-20 px-2 py-1 border border-gray-200 rounded text-right"
                                            />
                                        </td>
                                        <td className="p-3 text-center">
                                            <select
                                                value={v.status}
                                                onChange={(e) => updateField(v.id, 'status', e.target.value as ProductVariant['status'])}
                                                className="px-2 py-1 border border-gray-200 rounded text-xs"
                                            >
                                                <option value="Active">Đang bán</option>
                                                <option value="Inactive">Tạm ẩn</option>
                                                <option value="OutOfStock">Hết hàng</option>
                                            </select>
                                        </td>
                                        <td className="p-3 text-right whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => void saveRow(v)}
                                                disabled={savingId === v.id}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--accent-primary)] text-white text-xs font-semibold hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-60 mr-1 cursor-pointer"
                                            >
                                                <Save className="w-3 h-3" /> Lưu
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void deleteVariant(v)}
                                                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                                aria-label="Xoá"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
