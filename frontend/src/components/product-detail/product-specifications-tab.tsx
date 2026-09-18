/**
 * Full spec table, grouped exactly as the detail projection returns it
 * (`specGroups[i] = {groupId, groupName, sortOrder, values[]}` — catalog.md §1).
 *
 * The old flat client-side parse of `Products.Specifications` is gone: it keyed
 * rows by `label` only and silently overwrote 58 of the catalogue's 1504 lines
 * whenever two groups shared a label (integration-requests-w0 #52). The server
 * now parses the same jsonb and keeps the group, so the group IS the key.
 * Groups with no values are not rendered.
 */
import { ListChecks, Scale } from 'lucide-react';

import type { ProductSpecGroup } from '../../api/catalog/types';
import { Button } from '../ui';

interface ProductSpecificationsTabProps {
    specGroups?: ProductSpecGroup[] | null;
    /** Callback nút "So sánh với sản phẩm khác". */
    onCompareClick?: () => void;
}

export default function ProductSpecificationsTab({
    specGroups, onCompareClick,
}: ProductSpecificationsTabProps) {
    const groups = (specGroups ?? [])
        .map((g) => ({
            ...g,
            values: (g.values ?? []).filter((v) => v.value != null && String(v.value).trim() !== ''),
        }))
        .filter((g) => g.values.length > 0)
        .sort((a, b) => a.sortOrder - b.sortOrder);

    const rowCount = groups.reduce((n, g) => n + g.values.length, 0);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-xl font-bold text-fg">
                    <ListChecks className="h-5 w-5 text-brand" aria-hidden="true" />
                    Thông số kỹ thuật
                    {rowCount > 0 && (
                        <span className="text-sm font-normal text-fg-subtle">({rowCount} thông số)</span>
                    )}
                </h3>
                {onCompareClick && rowCount > 0 && (
                    <Button variant="outline" size="sm" onClick={onCompareClick}>
                        <Scale className="h-4 w-4" aria-hidden="true" />
                        So sánh với sản phẩm khác
                    </Button>
                )}
            </div>

            {groups.length === 0 ? (
                <p className="rounded-xl border border-line bg-surface p-6 text-sm italic text-fg-muted">
                    Chưa có thông số kỹ thuật cho sản phẩm này.
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {groups.map((group) => (
                        <div key={group.groupId || group.groupName} className="overflow-hidden rounded-xl border border-line bg-surface">
                            <div className="border-b border-line bg-sunken px-4 py-2.5">
                                <h4 className="text-sm font-bold uppercase tracking-wide text-fg">
                                    {group.groupName}
                                </h4>
                            </div>
                            <ul>
                                {group.values.map((v, idx) => (
                                    <li
                                        key={`${group.groupId}-${v.key}-${idx}`}
                                        className={`grid grid-cols-5 gap-3 px-4 py-2.5 text-sm ${
                                            idx % 2 === 0 ? 'bg-surface' : 'bg-sunken/50'
                                        }`}
                                    >
                                        <span className="col-span-2 break-words text-fg-subtle">{v.name}</span>
                                        <span className="col-span-3 break-words font-medium text-fg">
                                            {v.value}{v.unit ? ` ${v.unit}` : ''}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
