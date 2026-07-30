import { useEffect, useMemo, useState } from 'react';
import { Save, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    catalogApi,
    type SpecificationGroup,
    type SpecificationAttribute,
    type ProductSpecificationValue,
} from '../../api/catalog';

interface SpecificationEditorProps {
    productId: string;
    categoryId?: string;
}

type ValueDraft = {
    valueText?: string;
    valueNumber?: number;
    valueBool?: boolean;
};

/** Editor thông số theo nhóm/attribute — cấu trúc lấy theo category. */
export default function SpecificationEditor({ productId, categoryId }: SpecificationEditorProps) {
    const [groups, setGroups] = useState<SpecificationGroup[]>([]);
    const [draft, setDraft] = useState<Record<string, ValueDraft>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [g, bundle] = await Promise.all([
                categoryId ? catalogApi.getSpecGroupsByCategory(categoryId) : Promise.resolve<SpecificationGroup[]>([]),
                catalogApi.getProductWithDetails(productId).catch(() => null),
            ]);
            setGroups(Array.isArray(g) ? g : []);
            const initial: Record<string, ValueDraft> = {};
            (bundle?.specs || []).forEach((v: ProductSpecificationValue) => {
                initial[v.attributeId] = {
                    valueText: v.valueText,
                    valueNumber: v.valueNumber,
                    valueBool: v.valueBool,
                };
            });
            setDraft(initial);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [productId, categoryId]);

    const updateAttr = (attrId: string, patch: ValueDraft) => {
        setDraft((prev) => ({ ...prev, [attrId]: { ...prev[attrId], ...patch } }));
    };

    const totalFilled = useMemo(() => Object.values(draft).filter((v) =>
        (v.valueText !== undefined && v.valueText !== '') ||
        v.valueNumber !== undefined ||
        v.valueBool !== undefined
    ).length, [draft]);

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const values = Object.entries(draft)
                .filter(([, v]) => (v.valueText && v.valueText !== '') || v.valueNumber !== undefined || v.valueBool !== undefined)
                .map(([attributeId, v]) => ({
                    attributeId,
                    valueText: v.valueText,
                    valueNumber: v.valueNumber,
                    valueBool: v.valueBool,
                }));
            await catalogApi.upsertProductSpecifications(productId, values);
            toast.success(`Đã lưu ${values.length} thông số.`);
        } catch {
            toast.error('Lưu thông số thất bại.');
        } finally {
            setSaving(false);
        }
    };

    if (!categoryId) {
        return (
            <p className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg">
                Sản phẩm chưa có danh mục — chọn danh mục trong tab "Cơ bản" để hiển thị thông số.
            </p>
        );
    }
    if (loading) return <p className="text-sm text-gray-500 py-6 text-center">Đang tải...</p>;
    if (groups.length === 0) {
        return (
            <p className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg">
                Danh mục này chưa có nhóm thông số nào. Admin cần thiết lập ở màn "Danh mục".
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ListChecks className="w-4 h-4 text-[var(--accent-primary)]" />
                    Đã điền {totalFilled} thông số
                </div>
                <button
                    type="button"
                    onClick={() => void handleSaveAll()}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-60 cursor-pointer"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Đang lưu...' : 'Lưu tất cả'}
                </button>
            </div>

            {groups.map((g) => (
                <section key={g.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <header className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{g.name}</h4>
                    </header>
                    <div className="divide-y divide-gray-100">
                        {g.attributes.map((attr) => (
                            <SpecAttributeInput
                                key={attr.id}
                                attr={attr}
                                value={draft[attr.id] || {}}
                                onChange={(patch) => updateAttr(attr.id, patch)}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

// ============ Attribute input ============

interface SpecAttributeInputProps {
    attr: SpecificationAttribute;
    value: ValueDraft;
    onChange: (patch: ValueDraft) => void;
}

function SpecAttributeInput({ attr, value, onChange }: SpecAttributeInputProps) {
    return (
        <div className="grid grid-cols-3 gap-3 px-4 py-2.5 items-center">
            <label className="text-sm text-gray-700 col-span-1">
                {attr.name}{attr.unit ? ` (${attr.unit})` : ''}
            </label>
            <div className="col-span-2">
                {attr.dataType === 'Text' && (
                    <input
                        type="text"
                        value={value.valueText ?? ''}
                        onChange={(e) => onChange({ valueText: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    />
                )}
                {attr.dataType === 'Number' && (
                    <input
                        type="number"
                        value={value.valueNumber ?? ''}
                        onChange={(e) => onChange({ valueNumber: e.target.value === '' ? undefined : Number(e.target.value) })}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    />
                )}
                {attr.dataType === 'Boolean' && (
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={!!value.valueBool}
                            onChange={(e) => onChange({ valueBool: e.target.checked })}
                            className="rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-500">{value.valueBool ? 'Có' : 'Không'}</span>
                    </div>
                )}
                {attr.dataType === 'Enum' && (
                    <input
                        type="text"
                        value={value.valueText ?? ''}
                        onChange={(e) => onChange({ valueText: e.target.value })}
                        placeholder="Chọn/gõ giá trị"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    />
                )}
            </div>
        </div>
    );
}
