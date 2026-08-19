import { useMemo, useCallback } from 'react';
import type { ProductVariant, VariantOptionAssignment } from '../../api/catalog';

interface ProductVariantSelectorProps {
    variants: ProductVariant[];
    selectedVariantId?: string;
    onVariantChange: (variant: ProductVariant) => void;
}

interface OptionTypeGroup {
    typeId: string;
    typeName: string;
    inputType: 'Swatch' | 'Button' | 'Dropdown';
    values: Array<{
        valueId: string;
        display: string;
        colorHex?: string;
    }>;
}

/**
 * Chọn biến thể (RAM/SSD/màu…). Tổ hợp hết hàng vẫn hiện nhưng mờ + gạch ngang.
 * Đổi option → parent nhận variant mới; nếu không có tổ hợp khớp, giữ tổ hợp gần nhất.
 */
export default function ProductVariantSelector({
    variants, selectedVariantId, onVariantChange,
}: ProductVariantSelectorProps) {
    const selectedVariant = useMemo(
        () => variants.find((v) => v.id === selectedVariantId) ?? variants[0],
        [variants, selectedVariantId]
    );

    /** Phân nhóm option theo optionType, giữ thứ tự xuất hiện đầu tiên. */
    const optionGroups = useMemo<OptionTypeGroup[]>(() => {
        const map = new Map<string, OptionTypeGroup>();
        const inputTypeGuess = (opt: VariantOptionAssignment): OptionTypeGroup['inputType'] => {
            if (opt.colorHex) return 'Swatch';
            return 'Button';
        };
        for (const v of variants) {
            for (const opt of v.options) {
                let group = map.get(opt.optionTypeId);
                if (!group) {
                    group = {
                        typeId: opt.optionTypeId,
                        typeName: opt.typeName,
                        inputType: inputTypeGuess(opt),
                        values: [],
                    };
                    map.set(opt.optionTypeId, group);
                }
                if (!group.values.some((x) => x.valueId === opt.optionValueId)) {
                    group.values.push({
                        valueId: opt.optionValueId,
                        display: opt.valueDisplay,
                        colorHex: opt.colorHex,
                    });
                }
            }
        }
        return Array.from(map.values());
    }, [variants]);

    const currentSelection = useMemo<Record<string, string>>(() => {
        const acc: Record<string, string> = {};
        selectedVariant?.options.forEach((o) => { acc[o.optionTypeId] = o.optionValueId; });
        return acc;
    }, [selectedVariant]);

    /** Tính có variant nào tồn tại và còn hàng ứng với lựa chọn đang xét. */
    const findVariant = useCallback((typeId: string, valueId: string): ProductVariant | undefined => {
        const desired: Record<string, string> = { ...currentSelection, [typeId]: valueId };
        // Ưu tiên khớp mọi option
        const exact = variants.find((v) =>
            v.options.every((o) => desired[o.optionTypeId] === o.optionValueId) &&
            v.options.length === Object.keys(desired).length
        );
        if (exact) return exact;
        // Nếu không có tổ hợp khớp hết, tìm variant thoả mãn cặp (typeId, valueId)
        return variants.find((v) =>
            v.options.some((o) => o.optionTypeId === typeId && o.optionValueId === valueId)
        );
    }, [variants, currentSelection]);

    const handlePick = (typeId: string, valueId: string) => {
        const target = findVariant(typeId, valueId);
        if (target) onVariantChange(target);
    };

    if (variants.length === 0 || optionGroups.length === 0) return null;

    return (
        <div className="space-y-4">
            {optionGroups.map((group) => (
                <div key={group.typeId}>
                    <div className="flex items-baseline justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-700">{group.typeName}</label>
                        <span className="text-xs text-gray-500">
                            {selectedVariant?.options.find((o) => o.optionTypeId === group.typeId)?.valueDisplay || ''}
                        </span>
                    </div>

                    {group.inputType === 'Dropdown' ? (
                        <select
                            value={currentSelection[group.typeId] || ''}
                            onChange={(e) => handlePick(group.typeId, e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                        >
                            {group.values.map((val) => {
                                const variant = findVariant(group.typeId, val.valueId);
                                const disabled = !variant || variant.status !== 'Active' || variant.stockQuantity <= 0;
                                return (
                                    <option key={val.valueId} value={val.valueId} disabled={disabled}>
                                        {val.display}{disabled ? ' (Hết hàng)' : ''}
                                    </option>
                                );
                            })}
                        </select>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {group.values.map((val) => {
                                const variant = findVariant(group.typeId, val.valueId);
                                const isSelected = currentSelection[group.typeId] === val.valueId;
                                const outOfStock = !variant || variant.status !== 'Active' || variant.stockQuantity <= 0;
                                const baseCls = `relative px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer ${
                                    isSelected
                                        ? 'border-[var(--accent-primary)] text-[var(--accent-primary)] bg-red-50/60 font-semibold'
                                        : 'border-gray-200 text-gray-700 hover:border-gray-400 bg-white'
                                } ${outOfStock ? 'opacity-45 line-through' : ''}`;

                                if (group.inputType === 'Swatch' && val.colorHex) {
                                    return (
                                        <button
                                            key={val.valueId}
                                            type="button"
                                            title={val.display}
                                            aria-label={val.display}
                                            onClick={() => handlePick(group.typeId, val.valueId)}
                                            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30'
                                                    : 'border-gray-200 hover:border-gray-400'
                                            } ${outOfStock ? 'opacity-45' : ''}`}
                                            style={{ backgroundColor: val.colorHex }}
                                        >
                                            {outOfStock && <span className="block w-full h-0.5 bg-gray-400 rotate-45" />}
                                        </button>
                                    );
                                }

                                return (
                                    <button
                                        key={val.valueId}
                                        type="button"
                                        onClick={() => handlePick(group.typeId, val.valueId)}
                                        className={baseCls}
                                    >
                                        {val.display}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            ))}

            {selectedVariant && (
                <div className="text-xs text-gray-500">
                    Đã chọn: <span className="font-semibold text-gray-700">{selectedVariant.name}</span>
                    {' · '}
                    <span className="text-gray-500">SKU {selectedVariant.sku}</span>
                </div>
            )}
        </div>
    );
}
