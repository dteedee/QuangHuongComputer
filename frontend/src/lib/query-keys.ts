/**
 * Central query-key factory. One canonical key shape per domain so every
 * `useQuery`/`useMutation` (and any `queryClient.invalidateQueries(...)`)
 * across the app agrees on how a resource is addressed — before this,
 * screens hand-rolled ad-hoc arrays like `['order-confirmation', id]`,
 * which made cache invalidation after a mutation a guessing game.
 *
 * Usage:
 *   queryKeys.catalog.list({ categoryId, page })
 *   queryKeys.catalog.detail(productId)
 *   queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all })
 */

/** Arbitrary, JSON-serialisable filter/param bag for a list query. */
type QueryFilters = Record<string, unknown> | undefined;

/**
 * Builds the standard `{all, lists, list, details, detail}` shape for one
 * domain. Kept generic so adding a domain is a one-line addition, not a
 * copy-pasted block.
 */
function createDomainKeys(domain: string) {
  const all = [domain] as const;
  return {
    /** Root key for the whole domain — pass to `invalidateQueries` to drop everything under it. */
    all,
    lists: () => [...all, 'list'] as const,
    list: (filters?: QueryFilters) => [...all, 'list', filters ?? {}] as const,
    details: () => [...all, 'detail'] as const,
    detail: (id: string) => [...all, 'detail', id] as const,
  };
}

export const queryKeys = {
  catalog: createDomainKeys('catalog'),
  sales: createDomainKeys('sales'),
  inventory: createDomainKeys('inventory'),
  hr: createDomainKeys('hr'),
  accounting: createDomainKeys('accounting'),
  crm: createDomainKeys('crm'),
  warranty: createDomainKeys('warranty'),
  repair: createDomainKeys('repair'),
  content: createDomainKeys('content'),
  auth: createDomainKeys('auth'),
  // Not in the phase spec's domain list, but owned by this track's own hooks
  // (usePublicConfig, useNotifications) — same factory, same conventions.
  notifications: createDomainKeys('notifications'),
  config: {
    ...createDomainKeys('config'),
    /** `GET /api/config/public` — one shared cache entry for every consumer (see use-public-config.ts). */
    public: () => ['config', 'public'] as const,
  },
} as const;
