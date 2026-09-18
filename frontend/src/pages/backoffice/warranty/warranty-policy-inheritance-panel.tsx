/**
 * D08 §binding (phase-63 decision update): "leaf-to-root inheritance shown
 * explicitly so staff can see which policy actually applies." Backend has no
 * dedicated per-category resolution endpoint for the admin screen (only
 * `/warranty/policies/effective?productId=`, which needs a product) — this
 * panel walks the category tree client-side against the loaded policy list,
 * mirroring the server's own resolution order:
 * `Product.WarrantyMonths ?? policy(leaf) ?? policy(parent...) ?? policy(DEFAULT)`.
 * (0 months here means "no policy configured for this chain", not that the
 * shop promises 0 months — the actual resolution also consults
 * `Product.WarrantyMonths` first, which this admin view cannot see.)
 */
import { useEffect, useMemo, useState } from 'react';
import { GitBranch } from 'lucide-react';
import { catalogPublicListingApi } from '../../../api/catalog/public-listing';
import type { PublicCategory } from '../../../api/catalog/public-listing';
import type { WarrantyPolicy, WarrantyProvider as WarrantyProviderT } from '../../../api/warranty';

interface Props {
    policies: WarrantyPolicy[];
}

interface ChainResult {
    category: PublicCategory;
    chain: string[]; // category names, leaf first
    resolved: Record<WarrantyProviderT, { policy?: WarrantyPolicy; source: string }>;
}

export function WarrantyPolicyInheritancePanel({ policies }: Props) {
    const [categories, setCategories] = useState<PublicCategory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void catalogPublicListingApi.getCategories()
            .then(setCategories)
            .catch(() => setCategories([]))
            .finally(() => setLoading(false));
    }, []);

    const byId = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
    const activePolicies = useMemo(() => policies.filter(p => p.isActive), [policies]);

    const results: ChainResult[] = useMemo(() => {
        return categories.filter(c => c.isActive).map(cat => {
            const chain: string[] = [];
            const chainIds: (string | null | undefined)[] = [];
            let cur: PublicCategory | undefined = cat;
            let guard = 0;
            while (cur && guard++ < 10) {
                chain.push(cur.name);
                chainIds.push(cur.id);
                cur = cur.parentId ? byId.get(cur.parentId) : undefined;
            }
            const resolveFor = (provider: WarrantyProviderT) => {
                for (let i = 0; i < chainIds.length; i++) {
                    const p = activePolicies.find(pol => pol.categoryId === chainIds[i] && pol.provider === provider);
                    if (p) return { policy: p, source: i === 0 ? 'lá (chính danh mục)' : `cha "${chain[i]}"` };
                }
                const def = activePolicies.find(pol => !pol.categoryId && pol.provider === provider);
                if (def) return { policy: def, source: 'DEFAULT' };
                return { source: 'không có chính sách nào áp dụng' };
            };
            return {
                category: cat,
                chain,
                resolved: {
                    Manufacturer: resolveFor('Manufacturer'),
                    Store: resolveFor('Store'),
                },
            };
        });
    }, [categories, byId, activePolicies]);

    if (loading) return null;
    if (categories.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-1">
                <GitBranch size={18} className="text-emerald-600" />
                Chính sách áp dụng theo danh mục (leo cây lá → gốc)
            </h2>
            <p className="text-xs text-gray-500 mb-4">
                Mỗi danh mục: chính sách lá được ưu tiên, không có thì lấy của danh mục cha, cuối cùng là DEFAULT.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {results.map(r => (
                    <div key={r.category.id} className="border border-gray-100 rounded-xl p-3 text-sm">
                        <div className="font-bold text-gray-900 mb-1">
                            {r.chain.join(' ← ')}
                        </div>
                        {(['Manufacturer', 'Store'] as WarrantyProviderT[]).map(provider => (
                            <div key={provider} className="flex items-center justify-between text-xs mt-1">
                                <span className="text-gray-500">{provider === 'Manufacturer' ? 'Hãng' : 'Shop'}:</span>
                                <span className={r.resolved[provider].policy ? 'font-semibold text-gray-800' : 'text-gray-400 italic'}>
                                    {r.resolved[provider].policy
                                        ? `${r.resolved[provider].policy!.durationMonths} tháng (nguồn: ${r.resolved[provider].source})`
                                        : r.resolved[provider].source}
                                </span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default WarrantyPolicyInheritancePanel;
