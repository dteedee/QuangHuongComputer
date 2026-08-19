import { Store as StoreIcon } from 'lucide-react';
import type { Store } from '../../api/store';
import StoreCard from './store-card';

interface StoresResultsSectionProps {
  loading: boolean;
  error: string | null;
  visible: Store[];
  province: string;
  onOpenStore: (store: Store) => void;
}

/** Loading skeleton / error / empty state / results grid for the stores list. */
export default function StoresResultsSection({ loading, error, visible, province, onOpenStore }: StoresResultsSectionProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-56 rounded-lg bg-white border border-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-lg p-8 text-center">
        <p className="text-red-700 font-medium">{error}</p>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <StoreIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <h3 className="font-bold text-gray-900 mb-1">Không tìm thấy cửa hàng phù hợp</h3>
        <p className="text-sm text-gray-500">
          Thử tìm với từ khoá khác hoặc chọn tỉnh/thành khác.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-gray-500">
        Tìm thấy <span className="font-semibold text-gray-800">{visible.length}</span> chi nhánh
        {province ? ` tại ${province}` : ''}.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((store, index) => (
          <StoreCard
            key={store.id}
            store={store}
            index={index}
            onOpen={() => onOpenStore(store)}
          />
        ))}
      </div>
    </>
  );
}
