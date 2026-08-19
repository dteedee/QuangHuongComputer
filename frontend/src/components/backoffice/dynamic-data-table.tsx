import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings2, ArrowUp, ArrowDown } from 'lucide-react';
import { tableViewsApi, parseColumns, type TableColumnDef } from '../../api/table-views';
import { TableViewConfigModal } from './table-view-config-modal';

/** Format a raw cell value according to the column's declared `type`/`format`. */
function formatCell(value: unknown, column: TableColumnDef): React.ReactNode {
    if (value === null || value === undefined || value === '') return <span className="text-gray-300">—</span>;

    switch (column.type) {
        case 'currency':
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);
        case 'number':
            return new Intl.NumberFormat('vi-VN').format(Number(value) || 0);
        case 'date':
            try { return new Date(String(value)).toLocaleDateString('vi-VN'); } catch { return String(value); }
        case 'boolean':
            return value ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Có</span>
            ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Không</span>
            );
        case 'badge':
            return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">{String(value)}</span>;
        case 'image':
            return (
                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
                    <img src={String(value)} alt="" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                </div>
            );
        default:
            return String(value);
    }
}

function getValueByKey(row: Record<string, unknown>, key: string): unknown {
    // Support dotted paths (e.g. "category.name") without a heavy lodash dep.
    return key.split('.').reduce<unknown>((acc, part) => {
        if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
        return undefined;
    }, row);
}

interface DynamicDataTableProps<T extends Record<string, unknown>> {
    /** TableViewDefinition.Key, e.g. "admin.products" */
    viewKey: string;
    rows: T[];
    isLoading?: boolean;
    /** Row primary key extractor for React `key` + row actions */
    rowKey: (row: T) => string;
    /** Optional extra column rendered at the end (e.g. row actions) */
    renderActions?: (row: T) => React.ReactNode;
    onRowClick?: (row: T) => void;
    /** Show the "Cấu hình bảng" (configure columns) button — admin only */
    allowConfig?: boolean;
    /** Per-column-key custom cell renderer, overrides the default type-based formatter (e.g. resolve a FK id to a display name). */
    columnRenderers?: Partial<Record<string, (row: T) => React.ReactNode>>;
}

/**
 * Generic admin data-grid that renders columns from a server-side TableViewDefinition
 * instead of hard-coded JSX columns. Column show/hide + reorder is persisted back to
 * the API so every admin sees the same layout without a redeploy.
 */
export function DynamicDataTable<T extends Record<string, unknown>>({
    viewKey,
    rows,
    isLoading,
    rowKey,
    renderActions,
    onRowClick,
    allowConfig = true,
    columnRenderers,
}: DynamicDataTableProps<T>) {
    const queryClient = useQueryClient();
    const [showConfig, setShowConfig] = useState(false);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDesc, setSortDesc] = useState(false);

    const { data: view, isLoading: viewLoading } = useQuery({
        queryKey: ['table-view', viewKey],
        queryFn: () => tableViewsApi.getByKey(viewKey),
        staleTime: 5 * 60 * 1000,
    });

    const [columns, setColumns] = useState<TableColumnDef[]>([]);

    useEffect(() => {
        if (view) setColumns(parseColumns(view.columnsJson));
    }, [view]);

    const visibleColumns = useMemo(() => columns.filter(c => c.visible !== false), [columns]);

    const sortedRows = useMemo(() => {
        if (!sortKey) return rows;
        const copy = [...rows];
        copy.sort((a, b) => {
            const av = getValueByKey(a, sortKey);
            const bv = getValueByKey(b, sortKey);
            if (av === bv) return 0;
            const cmp = (av as any) > (bv as any) ? 1 : -1;
            return sortDesc ? -cmp : cmp;
        });
        return copy;
    }, [rows, sortKey, sortDesc]);

    const toggleSort = (col: TableColumnDef) => {
        if (!col.sortable) return;
        if (sortKey === col.key) { setSortDesc(prev => !prev); }
        else { setSortKey(col.key); setSortDesc(false); }
    };

    const handleSaveConfig = async (nextColumns: TableColumnDef[]) => {
        if (!view) return;
        await tableViewsApi.update(view.id, { columnsJson: JSON.stringify(nextColumns) });
        queryClient.invalidateQueries({ queryKey: ['table-view', viewKey] });
        setShowConfig(false);
    };

    if (viewLoading) {
        return <div className="py-16 text-center text-gray-400 text-sm">Đang tải cấu hình bảng…</div>;
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {allowConfig && (
                <div className="flex justify-end px-4 py-2 border-b border-gray-50">
                    <button
                        onClick={() => setShowConfig(true)}
                        className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-accent transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50"
                    >
                        <Settings2 size={14} /> Cấu hình bảng
                    </button>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/60">
                            {visibleColumns.map(col => (
                                <th
                                    key={col.key}
                                    style={{ width: col.width }}
                                    onClick={() => toggleSort(col)}
                                    className={`text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide select-none ${col.sortable ? 'cursor-pointer hover:text-accent' : ''}`}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        {col.label}
                                        {sortKey === col.key && (sortDesc ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
                                    </span>
                                </th>
                            ))}
                            {renderActions && <th className="px-4 py-3" />}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={visibleColumns.length + 1} className="text-center py-10 text-gray-400">Đang tải…</td></tr>
                        ) : sortedRows.length === 0 ? (
                            <tr><td colSpan={visibleColumns.length + 1} className="text-center py-10 text-gray-400">Không có dữ liệu</td></tr>
                        ) : (
                            sortedRows.map(row => (
                                <tr
                                    key={rowKey(row)}
                                    onClick={() => onRowClick?.(row)}
                                    className={`border-b border-gray-50 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                >
                                    {visibleColumns.map(col => (
                                        <td key={col.key} className="px-4 py-3 text-gray-800 font-medium">
                                            {columnRenderers?.[col.key] ? columnRenderers[col.key]!(row) : formatCell(getValueByKey(row, col.key), col)}
                                        </td>
                                    ))}
                                    {renderActions && (
                                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                            {renderActions(row)}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showConfig && columns.length > 0 && (
                <TableViewConfigModal
                    columns={columns}
                    onCancel={() => setShowConfig(false)}
                    onSave={handleSaveConfig}
                />
            )}
        </div>
    );
}
