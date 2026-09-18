/**
 * Quotation line editor — feels like the POS basket (Key Insights): search a
 * product, add it, edit quantity/unit price/discount inline, see the effect
 * right away. The number shown per line here is a client-side estimate for
 * feedback only — `unitPriceOverride: null` still means "server re-reads the
 * catalog price at save time" (contract §2 `POST`), and the authoritative
 * subtotal/VAT/total always comes back from the server after save.
 */
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { catalogAdminApi } from '../../../api/catalog/admin';
import { Input } from '../../../components/ui';
import type { QuotationLineInput } from '../../../api/sales/quotations';

export interface EditableLine extends QuotationLineInput {
  key: string;
  productName: string;
  productSku: string;
  /** Estimate shown while editing; `unitPriceOverride` is what's actually sent. */
  displayUnitPrice: number;
}

export function QuotationLineEditor({ lines, onChange, disabled }: {
  lines: EditableLine[];
  onChange: (lines: EditableLine[]) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ id: string; sku: string; name: string; price: number }[]>([]);

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await catalogAdminApi.listProducts({ page: 1, pageSize: 10, search: search.trim() });
      if (!cancelled) setResults(res.products.map((p) => ({ id: p.id, sku: p.sku, name: p.name, price: p.price })));
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search]);

  const addLine = (p: { id: string; sku: string; name: string; price: number }) => {
    if (lines.some((l) => l.productId === p.id)) return;
    onChange([...lines, {
      key: p.id, productId: p.id, productName: p.name, productSku: p.sku,
      quantity: 1, unitPriceOverride: null, lineDiscount: 0, displayUnitPrice: p.price,
    }]);
    setSearch(''); setResults([]);
  };

  const updateLine = (key: string, patch: Partial<EditableLine>) => {
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => onChange(lines.filter((l) => l.key !== key));

  const total = lines.reduce((sum, l) => sum + l.quantity * (l.unitPriceOverride ?? l.displayUnitPrice) - (l.lineDiscount ?? 0), 0);

  return (
    <div className="space-y-3">
      {!disabled && (
        <div className="relative">
          <Input placeholder="Tìm sản phẩm để thêm dòng..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {results.length > 0 && (
            <div className="absolute z-floating mt-1 w-full rounded border border-line bg-surface shadow-md">
              {results.map((p) => (
                <button key={p.id} type="button" onClick={() => addLine(p)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-subtle">
                  <span className="flex items-center gap-2"><Plus className="h-3.5 w-3.5" /> {p.name} <span className="num text-fg-muted">({p.sku})</span></span>
                  <span className="num">{p.price.toLocaleString('vi-VN')}đ</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {lines.length === 0 ? (
        <p className="rounded border border-dashed border-line px-3 py-6 text-center text-sm text-fg-muted">
          Chưa có dòng hàng nào. Tìm sản phẩm ở trên để thêm.
        </p>
      ) : (
        <div className="space-y-2">
          {lines.map((line) => (
            <div key={line.key} className="grid grid-cols-12 items-start gap-2 rounded border border-line p-2">
              <div className="col-span-4 pt-2 text-sm">{line.productName} <span className="num text-fg-muted">({line.productSku})</span></div>
              <label className="col-span-2 text-xs">SL
                <Input type="number" min={1} disabled={disabled} value={line.quantity}
                  onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) })} />
              </label>
              <label className="col-span-2 text-xs">Đơn giá (gồm VAT)
                <Input type="number" min={0} disabled={disabled}
                  value={line.unitPriceOverride ?? line.displayUnitPrice}
                  onChange={(e) => updateLine(line.key, { unitPriceOverride: Number(e.target.value) })} />
              </label>
              <label className="col-span-2 text-xs">Giảm giá dòng
                <Input type="number" min={0} disabled={disabled} value={line.lineDiscount ?? 0}
                  onChange={(e) => updateLine(line.key, { lineDiscount: Number(e.target.value) })} />
              </label>
              <div className="col-span-1 pt-2 text-right text-sm num">
                {(line.quantity * (line.unitPriceOverride ?? line.displayUnitPrice) - (line.lineDiscount ?? 0)).toLocaleString('vi-VN')}đ
              </div>
              {!disabled && (
                <div className="col-span-1 flex justify-end pt-2">
                  <button type="button" aria-label="Xoá dòng" onClick={() => removeLine(line.key)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {lines.length > 0 && (
        <p className="text-right text-sm font-semibold">
          Tạm tính (ước lượng, đã gồm VAT): <span className="num">{total.toLocaleString('vi-VN')}đ</span>
        </p>
      )}
    </div>
  );
}
