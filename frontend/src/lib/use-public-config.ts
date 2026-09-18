import { useQuery } from '@tanstack/react-query';
import { systemConfigApi, type ConfigurationEntry } from '../api/systemConfig';
import { queryKeys } from './query-keys';

// Public config (company info, theme overrides, feature flags) rarely changes
// mid-session; a long staleTime is what actually collapses N page fetches into
// one — TanStack Query dedupes truly concurrent requests for the same key
// regardless of staleTime, but a second component mounting moments later would
// still refetch under the default staleTime of 0.
const PUBLIC_CONFIG_STALE_TIME_MS = 5 * 60 * 1000;

/**
 * The one place that calls `GET /api/config/public`. Every consumer
 * (`ThemeContext`, `SystemConfigContext`, `useCompanyInfo`, `ContactPage`,
 * `Header`, `Footer`, ...) should call this hook instead of hitting
 * `systemConfigApi.config.getPublic()` directly — they then all share the same
 * TanStack Query cache entry, so mounting every one of them on the same page
 * still issues a single network request (this endpoint was measured at up to
 * 8 separate calls per page before this hook existed).
 */
export function usePublicConfig() {
  return useQuery<ConfigurationEntry[]>({
    queryKey: queryKeys.config.public(),
    queryFn: async () => {
      const data = await systemConfigApi.config.getPublic();
      return Array.isArray(data) ? data : [];
    },
    staleTime: PUBLIC_CONFIG_STALE_TIME_MS,
  });
}
