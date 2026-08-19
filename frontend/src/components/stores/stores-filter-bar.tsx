import { Search, X } from 'lucide-react';

interface StoresFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  province: string;
  onProvinceChange: (value: string) => void;
  provinces: string[];
}

/** Search + province filter bar for the stores listing page. */
export default function StoresFilterBar({ search, onSearchChange, province, onProvinceChange, provinces }: StoresFilterBarProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-small flex flex-col md:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Tìm theo tên hoặc địa chỉ..."
          className="w-full pl-11 pr-10 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[var(--accent-primary)]/20 outline-none placeholder:text-gray-400"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            aria-label="Xoá tìm kiếm"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <select
        value={province}
        onChange={e => onProvinceChange(e.target.value)}
        className="min-w-[180px] px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[var(--accent-primary)]/20 outline-none"
      >
        <option value="">Tất cả tỉnh/thành</option>
        {provinces.map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </div>
  );
}
