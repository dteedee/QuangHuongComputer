/**
 * "Đã xem gần đây" — stored per browser in localStorage.
 *
 * It now stores a small SNAPSHOT of each product (name, price, image, slug,
 * stock) instead of only its id. The id-only version forced the component to
 * call `GET /catalog/products/{id}` once per remembered product, and that
 * endpoint increments `viewCount` on every call — so simply opening one PDP
 * inflated the view counter of up to eight other products. No request is made
 * to render the strip any more.
 */
import { useCallback, useEffect, useState } from 'react';

import { browserStorage } from '../lib/browser-storage';

const STORAGE_KEY = 'recentlyViewedProducts';
const MAX_ITEMS = 10;

export interface RecentlyViewedSnapshot {
  id: string;
  name: string;
  price: number;
  oldPrice?: number | null;
  slug?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  stockQuantity: number;
  status?: string | null;
  averageRating?: number;
  reviewCount?: number;
  sku?: string | null;
}

interface RecentlyViewedItem {
  productId: string;
  viewedAt: number;
  product?: RecentlyViewedSnapshot;
}

function readItems(): RecentlyViewedItem[] {
  const items = browserStorage.getJSON<RecentlyViewedItem[]>(STORAGE_KEY, []);
  if (!Array.isArray(items)) return [];
  return items
    .filter((i) => i && typeof i.productId === 'string')
    .sort((a, b) => (b.viewedAt ?? 0) - (a.viewedAt ?? 0));
}

function writeItems(items: RecentlyViewedItem[]) {
  // Private mode / quota just means the strip stays empty — never a thrown error.
  browserStorage.setJSON(STORAGE_KEY, items);
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => { setItems(readItems()); }, []);

  /** Accepts the full snapshot; a bare id still works for legacy call sites. */
  const addToRecentlyViewed = useCallback((product: RecentlyViewedSnapshot | string) => {
    const snapshot = typeof product === 'string' ? undefined : product;
    const productId = typeof product === 'string' ? product : product.id;
    if (!productId) return;
    const next = [
      { productId, viewedAt: Date.now(), product: snapshot },
      ...readItems().filter((i) => i.productId !== productId),
    ].slice(0, MAX_ITEMS);
    writeItems(next);
    setItems(next);
  }, []);

  const removeFromRecentlyViewed = useCallback((productId: string) => {
    const next = readItems().filter((i) => i.productId !== productId);
    writeItems(next);
    setItems(next);
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    browserStorage.removeItem(STORAGE_KEY);
    setItems([]);
  }, []);

  return {
    /** Ids, newest first — kept for call sites that only need the order. */
    recentlyViewed: items.map((i) => i.productId),
    /** Products that carry a usable snapshot, newest first. */
    recentlyViewedProducts: items
      .map((i) => i.product)
      .filter((p): p is RecentlyViewedSnapshot => Boolean(p?.id && p?.name)),
    addToRecentlyViewed,
    removeFromRecentlyViewed,
    clearRecentlyViewed,
  };
}

export default useRecentlyViewed;
