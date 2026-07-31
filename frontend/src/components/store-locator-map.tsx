import { MapPin, ExternalLink } from 'lucide-react';
import type { Store } from '../api/store';

interface StoreLocatorMapProps {
    store: Pick<Store, 'name' | 'address' | 'ward' | 'district' | 'province' | 'latitude' | 'longitude'>;
    /** Chiều cao map (Tailwind class), mặc định h-64. */
    heightClass?: string;
}

/**
 * Bản đồ định vị cửa hàng — dùng Google Maps iframe embed công khai (KHÔNG cần API key).
 *
 * Ưu tiên toạ độ (lat/lng). Nếu không có, dùng địa chỉ text để tìm.
 * Nếu cả hai đều thiếu → placeholder.
 */
export default function StoreLocatorMap({ store, heightClass = 'h-64' }: StoreLocatorMapProps) {
    const fullAddress = [store.address, store.ward, store.district, store.province]
        .filter(Boolean)
        .join(', ');

    const hasCoords = store.latitude != null && store.longitude != null;
    const hasAddress = fullAddress.trim().length > 0;

    if (!hasCoords && !hasAddress) {
        return (
            <div className={`${heightClass} rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center text-center p-6`}>
                <MapPin className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Vui lòng liên hệ để biết đường đi</p>
            </div>
        );
    }

    const q = hasCoords
        ? `${store.latitude},${store.longitude}`
        : encodeURIComponent(fullAddress);
    const embedUrl = `https://maps.google.com/maps?q=${q}&z=15&output=embed`;
    const openUrl = hasCoords
        ? `https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

    return (
        <div className="space-y-2">
            <div className={`${heightClass} w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-100`}>
                <iframe
                    title={`Bản đồ ${store.name}`}
                    src={embedUrl}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </div>
            <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-primary,#dc2626)] hover:underline"
            >
                <ExternalLink className="w-4 h-4" />
                Mở trong Google Maps
            </a>
        </div>
    );
}
