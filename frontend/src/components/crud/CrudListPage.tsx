import { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { DataTable, Column } from './DataTable';

export interface CrudListPageProps<T extends { id: string }> {
  title: string;
  subtitle?: string;
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSort?: (field: string) => void;
  isLoading?: boolean;
  onAdd?: () => void;
  actions?: (item: T) => ReactNode;
  filters?: ReactNode;
  addButtonLabel?: string;
  canAdd?: boolean;
}

export function CrudListPage<T extends { id: string }>({
  title,
  subtitle,
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  onSort,
  isLoading = false,
  onAdd,
  actions,
  filters,
  addButtonLabel = 'Add New',
  canAdd = true,
}: CrudListPageProps<T>) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
          </div>
          {onAdd && canAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              {addButtonLabel}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {filters && <div className="mb-6">{filters}</div>}

      {/* Table */}
      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onSort={onSort}
        isLoading={isLoading}
        actions={actions}
      />
    </div>
  );
}
