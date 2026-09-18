import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { catalogAdminApi } from '../../../api/catalog/admin';
import { getGoodsReceivedNotes } from '../../../api/inventory';
import { Input, Select, Button, Badge } from '../../../components/ui';

interface PickedProduct {
    id: string;
    sku: string;
    name: string;
}

interface LabelPickerPanelProps {
    mode: 'products' | 'grn';
    onModeChange: (mode: 'products' | 'grn') => void;
    picked: PickedProduct[];
    onPickedChange: (p: PickedProduct[]) => void;
    grnId: string | null;
    onGrnIdChange: (id: string | null) => void;
}

/**
 * Left panel of the label builder: either search-and-tick products, or pick a confirmed GRN
 * (re-print always matches the document's own serials — inventory-bulk.md §7).
 * No shared multi-select in the kit does this job (`AsyncSearchableSelect` is single-value),
 * so this is a small purpose-built list — not a fork of an existing primitive.
 */
export function LabelPickerPanel({ mode, onModeChange, picked, onPickedChange, grnId, onGrnIdChange }: LabelPickerPanelProps) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<PickedProduct[]>([]);
    const [searching, setSearching] = useState(false);
    const [grns, setGrns] = useState<{ id: string; documentNumber: string }[]>([]);

    useEffect(() => {
        if (mode !== 'products' || search.trim().length < 2) { setResults([]); return; }
        let cancelled = false;
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const res = await catalogAdminApi.listProducts({ page: 1, pageSize: 15, search: search.trim() });
                if (!cancelled) setResults(res.products.map((p) => ({ id: p.id, sku: p.sku, name: p.name })));
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 300);
        return () => { cancelled = true; clearTimeout(t); };
    }, [search, mode]);

    useEffect(() => {
        if (mode !== 'grn') return;
        void getGoodsReceivedNotes(1, 20).then((data) => {
            const items = Array.isArray(data) ? data : data.items || [];
            setGrns(items.map((g: any) => ({ id: g.id, documentNumber: g.documentNumber })));
        });
    }, [mode]);

    const toggle = (p: PickedProduct) => {
        const exists = picked.some((x) => x.id === p.id);
        onPickedChange(exists ? picked.filter((x) => x.id !== p.id) : [...picked, p]);
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <Button size="sm" variant={mode === 'products' ? 'primary' : 'outline'} onClick={() => onModeChange('products')}>Theo sản phẩm</Button>
                <Button size="sm" variant={mode === 'grn' ? 'primary' : 'outline'} onClick={() => onModeChange('grn')}>Theo phiếu nhập (GRN)</Button>
            </div>

            {mode === 'products' ? (
                <div className="space-y-2">
                    <Input placeholder="Tìm theo tên hoặc SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    {searching && <div className="text-xs text-fg-muted">Đang tìm...</div>}
                    {results.length > 0 && (
                        <div className="max-h-56 overflow-auto rounded border border-line">
                            {results.map((p) => (
                                <button key={p.id} type="button" onClick={() => toggle(p)}
                                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-subtle">
                                    <span>{p.name} <span className="num text-fg-muted">({p.sku})</span></span>
                                    {picked.some((x) => x.id === p.id) && <Badge>Đã chọn</Badge>}
                                </button>
                            ))}
                        </div>
                    )}
                    {picked.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {picked.map((p) => (
                                <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2 py-1 text-xs">
                                    {p.sku}
                                    <button type="button" aria-label={`Bỏ ${p.sku}`} onClick={() => toggle(p)}><X className="h-3 w-3" /></button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <Select
                    options={grns.map((g) => ({ value: g.id, label: g.documentNumber }))}
                    value={grnId ?? ''}
                    onChange={(e) => onGrnIdChange(e.target.value || null)}
                />
            )}
        </div>
    );
}
