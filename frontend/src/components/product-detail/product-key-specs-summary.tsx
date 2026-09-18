/**
 * "Cấu hình nổi bật" — the 4-6 specs a buyer scans before scrolling. Values are
 * picked out of the SAME `specGroups` payload the full table renders, in a
 * priority order (CPU / RAM / ổ cứng / card đồ hoạ / màn hình / pin); when none
 * of the priority keys exist the first few real values are shown instead.
 * Nothing is rendered when the product has no structured specs at all.
 */
import type { ProductSpecGroup } from '../../api/catalog/types';

interface ProductKeySpecsSummaryProps {
    specGroups?: ProductSpecGroup[] | null;
    max?: number;
}

/** Slugified keys the importer produces, most useful first. */
const PRIORITY_KEYS = [
    'cpu', 'chip', 'vi-xu-ly',
    'ram', 'bo-nho',
    'o-cung', 'dung-luong', 'luu-tru',
    'card-do-hoa', 'do-hoa', 'gpu', 'vga',
    'man-hinh', 'kich-thuoc', 'do-phan-giai', 'tam-nen',
    'dung-luong-pin', 'pin',
    'cong-suat', 'den-nen', 'ket-noi',
];

export interface FlatSpec {
    key: string;
    name: string;
    value: string;
    unit?: string | null;
}

export function flattenSpecs(specGroups?: ProductSpecGroup[] | null): FlatSpec[] {
    return (specGroups ?? []).flatMap((g) =>
        (g.values ?? [])
            .filter((v) => v.value != null && String(v.value).trim() !== '')
            .map((v) => ({ key: v.key, name: v.name, value: String(v.value), unit: v.unit }))
    );
}

export function pickKeySpecs(specGroups?: ProductSpecGroup[] | null, max = 5): FlatSpec[] {
    const flat = flattenSpecs(specGroups);
    if (flat.length === 0) return [];
    const picked: FlatSpec[] = [];
    const taken = new Set<string>();
    PRIORITY_KEYS.forEach((key) => {
        if (picked.length >= max) return;
        const hit = flat.find((s) => s.key === key && !taken.has(s.key));
        if (hit) { picked.push(hit); taken.add(hit.key); }
    });
    flat.forEach((s) => {
        if (picked.length >= max || taken.has(s.key)) return;
        picked.push(s);
        taken.add(s.key);
    });
    return picked;
}

export default function ProductKeySpecsSummary({ specGroups, max = 5 }: ProductKeySpecsSummaryProps) {
    const specs = pickKeySpecs(specGroups, max);
    if (specs.length === 0) return null;

    return (
        <section className="rounded-xl border border-line bg-sunken/60 p-4" aria-label="Cấu hình nổi bật">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-subtle">
                Cấu hình nổi bật
            </h2>
            <dl className="space-y-1.5">
                {specs.map((s) => (
                    <div key={s.key} className="flex gap-3 text-sm">
                        <dt className="w-28 flex-shrink-0 text-fg-subtle">{s.name}</dt>
                        <dd className="min-w-0 flex-1 font-medium text-fg">
                            {s.value}{s.unit ? ` ${s.unit}` : ''}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
