import { useMemo } from 'react';
import { Scale, ListChecks } from 'lucide-react';
import type {
    SpecificationGroup,
    ProductSpecificationValue,
    SpecificationAttribute,
} from '../../api/catalog';

interface ProductSpecificationsTabProps {
    /** Cấu trúc nhóm/attribute (nếu có — từ danh mục). */
    specGroups?: SpecificationGroup[];
    /** Giá trị đã nhập cho sản phẩm hiện tại. */
    specValues?: ProductSpecificationValue[];
    /** Fallback: JSON specifications cũ khi chưa có dữ liệu có cấu trúc. */
    legacySpecs?: Record<string, string>;
    /** Callback nút "So sánh với sản phẩm khác". */
    onCompareClick?: () => void;
}

/** Định dạng giá trị theo dataType. */
function formatSpecValue(attr: SpecificationAttribute, value: ProductSpecificationValue): string {
    switch (attr.dataType) {
        case 'Number':
            if (value.valueNumber === undefined || value.valueNumber === null) return '—';
            return `${value.valueNumber}${attr.unit ? ` ${attr.unit}` : ''}`;
        case 'Boolean':
            if (value.valueBool === undefined || value.valueBool === null) return '—';
            return value.valueBool ? 'Có' : 'Không';
        case 'Text':
        case 'Enum':
        default:
            return value.valueText ?? '—';
    }
}

/**
 * Bảng thông số theo `SpecificationGroup`: mỗi group là 1 card.
 * Nếu không có dữ liệu có cấu trúc → hiển thị bảng phẳng từ `legacySpecs`.
 */
export default function ProductSpecificationsTab({
    specGroups, specValues, legacySpecs, onCompareClick,
}: ProductSpecificationsTabProps) {
    const valuesByAttr = useMemo(() => {
        const map = new Map<string, ProductSpecificationValue>();
        (specValues || []).forEach((v) => map.set(v.attributeId, v));
        return map;
    }, [specValues]);

    const hasStructured = Boolean(specGroups && specGroups.length > 0 && specValues && specValues.length > 0);
    const legacyEntries = legacySpecs ? Object.entries(legacySpecs) : [];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-[var(--accent-primary)]" />
                    Thông số kỹ thuật
                </h3>
                {onCompareClick && (hasStructured || legacyEntries.length > 0) && (
                    <button
                        type="button"
                        onClick={onCompareClick}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--accent-primary)] text-[var(--accent-primary)] text-sm font-semibold hover:bg-red-50 transition-colors cursor-pointer"
                    >
                        <Scale className="w-4 h-4" />
                        So sánh với sản phẩm khác
                    </button>
                )}
            </div>

            {hasStructured ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {specGroups!.map((group) => {
                        const attrsWithValue = group.attributes.filter((a) => valuesByAttr.has(a.id));
                        if (attrsWithValue.length === 0) return null;
                        return (
                            <div key={group.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                        {group.name}
                                    </h4>
                                </div>
                                <ul>
                                    {attrsWithValue.map((attr, idx) => {
                                        const value = valuesByAttr.get(attr.id)!;
                                        return (
                                            <li
                                                key={attr.id}
                                                className={`grid grid-cols-5 gap-3 px-4 py-2.5 text-sm ${
                                                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                                                }`}
                                            >
                                                <span className="col-span-2 text-gray-600">{attr.name}</span>
                                                <span className="col-span-3 text-gray-900 font-medium">
                                                    {formatSpecValue(attr, value)}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            ) : legacyEntries.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    {legacyEntries.map(([key, value], idx) => (
                        <div
                            key={key}
                            className={`grid grid-cols-3 gap-4 py-2.5 px-5 text-sm ${
                                idx % 2 === 0 ? 'bg-gray-50/60' : 'bg-white'
                            }`}
                        >
                            <div className="text-gray-600">{key}</div>
                            <div className="col-span-2 text-gray-900 font-medium">{value}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 italic bg-white p-6 rounded-xl border border-gray-100 text-sm">
                    Chưa có thông số kỹ thuật cho sản phẩm này.
                </p>
            )}
        </div>
    );
}
