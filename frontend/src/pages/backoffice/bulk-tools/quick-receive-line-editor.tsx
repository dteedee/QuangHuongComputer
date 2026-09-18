import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { catalogAdminApi } from '../../../api/catalog/admin';
import type { QuickReceiveLine } from '../../../api/bulk-tools';
import { Input, Textarea } from '../../../components/ui';

interface QuickReceiveLineEditorProps {
    lines: QuickReceiveLine[];
    onChange: (lines: QuickReceiveLine[]) => void;
}

/**
 * Line editor for quick receive. The phase file says it "reuses the GRN wizard's line editor" —
 * there is no such shared component: the codebase's only existing GRN line UI
 * (`grn-inspection-form.tsx`) inspects a FIXED set of lines already tied to a PO/GRN id and has
 * no product picker, so it cannot add new lines. This is a purpose-built equivalent with the
 * same fields (product, quantity, unit cost, serials). See track report — filed as a deviation,
 * not a silent fork of an owned component.
 */
export function QuickReceiveLineEditor({ lines, onChange }: QuickReceiveLineEditorProps) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<{ id: string; sku: string; name: string }[]>([]);

    useEffect(() => {
        if (search.trim().length < 2) { setResults([]); return; }
        let cancelled = false;
        const t = setTimeout(async () => {
            const res = await catalogAdminApi.listProducts({ page: 1, pageSize: 10, search: search.trim() });
            if (!cancelled) setResults(res.products.map((p) => ({ id: p.id, sku: p.sku, name: p.name })));
        }, 300);
        return () => { cancelled = true; clearTimeout(t); };
    }, [search]);

    const addLine = (p: { id: string; sku: string; name: string }) => {
        if (lines.some((l) => l.productId === p.id)) return;
        onChange([...lines, { productId: p.id, productName: `${p.name} (${p.sku})`, quantity: 1, unitCost: 0 }]);
        setSearch(''); setResults([]);
    };

    const updateLine = (idx: number, patch: Partial<QuickReceiveLine>) => {
        onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
    };

    const removeLine = (idx: number) => onChange(lines.filter((_, i) => i !== idx));

    return (
        <div className="space-y-3">
            <div className="relative">
                <Input placeholder="Tìm sản phẩm để thêm dòng..." value={search} onChange={(e) => setSearch(e.target.value)} />
                {results.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded border border-line bg-surface shadow-md">
                        {results.map((p) => (
                            <button key={p.id} type="button" onClick={() => addLine(p)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-subtle">
                                <Plus className="h-3.5 w-3.5" /> {p.name} <span className="num text-fg-muted">({p.sku})</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {lines.length === 0 ? (
                <p className="rounded border border-dashed border-line px-3 py-6 text-center text-sm text-fg-muted">Chưa có dòng hàng nào. Tìm sản phẩm ở trên để thêm.</p>
            ) : (
                <div className="space-y-2">
                    {lines.map((line, idx) => (
                        <div key={line.productId} className="grid grid-cols-12 items-start gap-2 rounded border border-line p-2">
                            <div className="col-span-4 pt-2 text-sm">{line.productName}</div>
                            <label className="col-span-2 text-xs">SL
                                <Input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })} />
                            </label>
                            <label className="col-span-2 text-xs">Đơn giá vốn
                                <Input type="number" min={0} value={line.unitCost} onChange={(e) => updateLine(idx, { unitCost: Number(e.target.value) })} />
                            </label>
                            <label className="col-span-3 text-xs">Serial (cách nhau bằng ;)
                                <Textarea rows={1} value={(line.serialNumbers ?? []).join(';')}
                                    onChange={(e) => updateLine(idx, { serialNumbers: e.target.value.split(';').map((s) => s.trim()).filter(Boolean) })} />
                            </label>
                            <div className="col-span-1 flex justify-end pt-2">
                                <button type="button" aria-label="Xoá dòng" onClick={() => removeLine(idx)}>
                                    <Trash2 className="h-4 w-4 text-danger" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
