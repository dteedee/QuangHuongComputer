import { MapPin, Phone, Clock, Store as StoreIcon, Mail, X } from 'lucide-react';
import { parseOpeningHours, getTodayHours, DAY_KEYS, DAY_LABELS, type Store } from '../../api/store';
import StoreLocatorMap from '../store-locator-map';
import StoreInfoRow from './store-info-row';

interface StoreDetailModalProps {
  store: Store;
  onClose: () => void;
}

/** Modal with full store details: contact info, weekly hours, and map. */
export default function StoreDetailModal({ store, onClose }: StoreDetailModalProps) {
  const fullAddress = [store.address, store.ward, store.district, store.province]
    .filter(Boolean)
    .join(', ');
  const hours = parseOpeningHours(store.openingHoursJson);
  const todayHours = getTodayHours(store.openingHoursJson);
  const jsDay = new Date().getDay(); // 0 = CN
  const dayIndexMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayKey = dayIndexMap[jsDay];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
              <StoreIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">{store.name}</h2>
              {store.isPickupPoint && (
                <span className="inline-block mt-0.5 text-[11px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full font-semibold">
                  Nhận tại cửa hàng
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full flex-shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Info block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StoreInfoRow icon={<MapPin className="w-4 h-4" />} label="Địa chỉ">
              {fullAddress || 'Đang cập nhật'}
            </StoreInfoRow>
            <StoreInfoRow icon={<Phone className="w-4 h-4" />} label="Điện thoại">
              {store.phone ? (
                <a href={`tel:${store.phone}`} className="hover:text-[var(--accent-primary)]">
                  {store.phone}
                </a>
              ) : '—'}
            </StoreInfoRow>
            {store.email && (
              <StoreInfoRow icon={<Mail className="w-4 h-4" />} label="Email">
                <a href={`mailto:${store.email}`} className="hover:text-[var(--accent-primary)]">
                  {store.email}
                </a>
              </StoreInfoRow>
            )}
            <StoreInfoRow icon={<Clock className="w-4 h-4" />} label="Giờ mở cửa hôm nay">
              {todayHours && todayHours !== 'closed' ? (
                <span className="text-emerald-700 font-semibold">{todayHours}</span>
              ) : (
                <span className="text-gray-500 italic">Nghỉ</span>
              )}
            </StoreInfoRow>
          </div>

          {/* Opening hours table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Giờ mở cửa cả tuần
            </h3>
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-gray-50/60">
              {DAY_KEYS.map(day => {
                const value = hours[day];
                const isToday = day === todayKey;
                return (
                  <li
                    key={day}
                    className={`flex items-center justify-between px-4 py-2 text-sm ${
                      isToday ? 'bg-red-50/70 font-semibold' : ''
                    }`}
                  >
                    <span className={isToday ? 'text-[var(--accent-primary)]' : 'text-gray-700'}>
                      {DAY_LABELS[day]}{isToday ? ' (hôm nay)' : ''}
                    </span>
                    <span className={value === 'closed' || !value ? 'text-gray-400 italic' : 'text-gray-800'}>
                      {!value ? '—' : value === 'closed' ? 'Nghỉ' : value}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Map */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              Vị trí trên bản đồ
            </h3>
            <StoreLocatorMap store={store} heightClass="h-72" />
          </div>
        </div>
      </div>
    </div>
  );
}
