import { ReactNode } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
    key: string;
    header: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render?: (item: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyExtractor: (item: T) => string;
    loading?: boolean;
    emptyMessage?: string;
    pagination?: {
        page: number;
        pageSize: number;
        total: number;
        onPageChange: (page: number) => void;
    };
    onRowClick?: (item: T) => void;
    selectedRows?: string[];
    onSelectRow?: (id: string) => void;
    onSelectAll?: (selected: boolean) => void;
}

export function DataTable<T>({
    columns,
    data,
    keyExtractor,
    loading,
    emptyMessage = 'Không có dữ liệu',
    pagination,
    onRowClick,
    selectedRows,
    onSelectRow,
    onSelectAll,
}: DataTableProps<T>) {
    const { isDark, colors } = useTheme();

    const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0;

    const alignClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    };

    return (
        <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
        }`}>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className={`border-b ${isDark ? 'bg-gray-800/50 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                        <tr>
                            {onSelectRow && (
                                <th className="px-4 py-4 w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedRows?.length === data.length && data.length > 0}
                                        onChange={(e) => onSelectAll?.(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300"
                                        style={{ accentColor: colors.primary }}
                                    />
                                </th>
                            )}
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-6 py-4 text-xs font-bold uppercase tracking-wider ${
                                        alignClasses[col.align || 'left']
                                    } ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                                    style={{ width: col.width }}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-gray-800' : 'divide-gray-100'}`}>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    {onSelectRow && <td className="px-4 py-4" />}
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-6 py-4">
                                            <div className={`h-4 rounded animate-pulse ${
                                                isDark ? 'bg-gray-800' : 'bg-gray-200'
                                            }`} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (onSelectRow ? 1 : 0)}
                                    className={`px-6 py-16 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            data.map((item, index) => {
                                const key = keyExtractor(item);
                                const isSelected = selectedRows?.includes(key);
                                return (
                                    <tr
                                        key={key}
                                        onClick={() => onRowClick?.(item)}
                                        className={`transition-colors ${
                                            onRowClick ? 'cursor-pointer' : ''
                                        } ${
                                            isSelected
                                                ? isDark ? 'bg-gray-800/50' : 'bg-gray-50'
                                                : isDark ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        {onSelectRow && (
                                            <td className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => onSelectRow(key)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-4 h-4 rounded border-gray-300"
                                                    style={{ accentColor: colors.primary }}
                                                />
                                            </td>
                                        )}
                                        {columns.map((col) => (
                                            <td
                                                key={col.key}
                                                className={`px-6 py-4 ${alignClasses[col.align || 'left']} ${
                                                    isDark ? 'text-gray-300' : 'text-gray-700'
                                                }`}
                                            >
                                                {col.render
                                                    ? col.render(item, index)
                                                    : (item as any)[col.key]}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {pagination && totalPages > 1 && (
                <div className={`flex items-center justify-between px-6 py-4 border-t ${
                    isDark ? 'border-gray-800' : 'border-gray-100'
                }`}>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Hiển thị {(pagination.page - 1) * pagination.pageSize + 1} -{' '}
                        {Math.min(pagination.page * pagination.pageSize, pagination.total)} / {pagination.total}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => pagination.onPageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className={`p-2 rounded-lg disabled:opacity-50 transition-colors ${
                                isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                            }`}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Trang {pagination.page} / {totalPages}
                        </span>
                        <button
                            onClick={() => pagination.onPageChange(pagination.page + 1)}
                            disabled={pagination.page === totalPages}
                            className={`p-2 rounded-lg disabled:opacity-50 transition-colors ${
                                isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                            }`}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
