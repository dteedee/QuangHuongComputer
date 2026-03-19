import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useComparison } from '../../context/ComparisonContext';
import { X, Scale, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

export function ComparisonBar() {
  const { items, removeFromComparison, clearComparison } = useComparison();
  const [isExpanded, setIsExpanded] = useState(true);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-t-lg shadow-lg flex items-center gap-2 hover:bg-red-700 transition"
      >
        <Scale />
        <span className="font-medium">So sánh ({items.length})</span>
        {isExpanded ? <ChevronDown /> : <ChevronUp />}
      </button>

      {/* Main bar */}
      <div
        className={`bg-white border-t border-gray-200 shadow-lg transform transition-transform duration-300 ${
          isExpanded ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Products */}
            <div className="flex-1 flex items-center gap-4 overflow-x-auto pb-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 bg-gray-50 rounded-lg p-2 pr-3 min-w-[200px] flex-shrink-0 group"
                >
                  {/* Image */}
                  <div className="w-16 h-16 bg-white rounded-lg overflow-hidden border flex-shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Scale />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-sm font-bold text-red-600">{formatCurrency(item.price)}</p>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeFromComparison(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition opacity-0 group-hover:opacity-100"
                    title="Xóa khỏi so sánh"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: 4 - items.length }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="w-[200px] h-20 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-sm flex-shrink-0"
                >
                  + Thêm sản phẩm
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              {items.length >= 2 && (
                <Link
                  to="/compare"
                  className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                >
                  <Scale />
                  So sánh ngay
                </Link>
              )}
              <button
                onClick={clearComparison}
                className="px-4 py-2 text-gray-500 hover:text-red-600 text-sm flex items-center gap-2 justify-center"
              >
                <Trash2 className="w-3 h-3" />
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComparisonBar;
