import { MapPin, Phone, Clock, Store as StoreIcon, ExternalLink } from 'lucide-react';
import { getTodayHours, type Store } from '../../api/store';
import { buildMapsUrl } from './build-store-maps-url';

interface StoreCardProps {
  store: Store;
  index: number;
  onOpen: () => void;
}

/** Store summary card shown in the store list grid. */
export default function StoreCard({ store, index, onOpen }: StoreCardProps) {
  const fullAddress = [store.address, store.ward, store.district, store.province]
    .filter(Boolean)
    .join(', ');
  const todayHours = getTodayHours(store.openingHoursJson);
  const isOpenToday = todayHours && todayHours !== 'closed';

  const mapsUrl = buildMapsUrl(store);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left bg-white rounded-lg border border-gray-200 hover:shadow-medium hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-3"
    >
      {/* Header: số thứ tự tròn đỏ + tên — pattern hệ thống showroom hacom footer */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
            {index + 1}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 leading-tight line-clamp-1">{store.name}</h3>
            {store.isPickupPoint && (
              <span className="inline-block mt-0.5 text-[11px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full font-semibold">
                Nhận tại cửa hàng
              </span>
            )}
          </div>
        </div>
        <StoreIcon className="w-5 h-5 text-gray-300 flex-shrink-0" />
      </div>

      <div className="text-sm text-gray-600 space-y-1.5">
        <p className="flex items-start gap-2">
          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
          <span className="line-clamp-2">{fullAddress || 'Đang cập nhật địa chỉ'}</span>
        </p>
        {store.phone && (
          <p className="flex items-center gap-2">
            <Phone className="w-4 h-4 flex-shrink-0 text-gray-400" />
            <a
              href={`tel:${store.phone}`}
              onClick={e => e.stopPropagation()}
              className="hover:text-[var(--accent-primary)]"
            >
              {store.phone}
            </a>
          </p>
        )}
        <p className="flex items-center gap-2">
          <Clock className="w-4 h-4 flex-shrink-0 text-gray-400" />
          {isOpenToday ? (
            <span>
              <span className="text-emerald-600 font-semibold">Hôm nay:</span> {todayHours}
            </span>
          ) : (
            <span className="text-gray-500 italic">Hôm nay: nghỉ</span>
          )}
        </p>
      </div>

      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-primary)] hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          Chỉ đường Google Maps
        </a>
      )}
    </button>
  );
}
