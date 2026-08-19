import type { Store } from '../../api/store';

/** Build a Google Maps search URL for a store, preferring lat/lng over the text address. */
export function buildMapsUrl(store: Pick<Store, 'address' | 'ward' | 'district' | 'province' | 'latitude' | 'longitude'>): string | null {
    if (store.latitude != null && store.longitude != null) {
        return `https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`;
    }
    const address = [store.address, store.ward, store.district, store.province].filter(Boolean).join(', ');
    if (!address) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
