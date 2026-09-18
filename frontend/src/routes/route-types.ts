import type { ComponentType, LazyExoticComponent } from 'react';

/** Which shell renders this route. Drives where `<Route>` mounts (see routes/index.ts). */
export type RouteLayout = 'storefront' | 'backoffice' | 'standalone';

/** SEO indexing intent for the storefront SEO shell (D11 / W2-17a). Defaults to 'noindex'. */
export type RouteSeo = 'index' | 'noindex';

/**
 * One entry in the app's route manifest — the single source of truth the
 * router, sidebar, command palette, breadcrumbs and `paths` helper are all
 * generated from (phase-17-w1-fe-app-shell.md).
 *
 * `path` is RELATIVE to the route's layout mount point (no leading slash),
 * exactly as React Router expects for a nested child `<Route>`:
 *   - layout 'storefront' mounts under `/`          → path 'san-pham/:slug'
 *   - layout 'backoffice' mounts under `/backoffice` → path 'inventory/rfq/:id'
 *   - layout 'standalone'  is the full absolute path  → path '/login'
 * Use `path: ''` for a layout's index route (rendered as `<Route index .../>`).
 */
export interface RouteDef {
  path: string;
  /** Lazy-loaded page component (default export via `.then(m => ({ default: m.X }))` when named). */
  element: LazyExoticComponent<ComponentType>;
  /** Sidebar / command-palette / breadcrumb label (Vietnamese). Omit for routes with no nav presence. */
  title?: string;
  /** Short command-palette subtitle. */
  description?: string;
  /** `lucide-react` icon name, resolved via `utils/icon-registry`. */
  icon?: string;
  /** Sidebar group id (backoffice only) — see `backoffice-sidebar-menu-config.ts`. */
  group?: string;
  /** Sidebar badge source key (backoffice only), e.g. 'pendingOrders' — resolved to a live count
   *  by `use-backoffice-menu.ts`, matching `BackofficeMenuItemConfig.badgeSource`. */
  badgeSource?: string | null;
  /** Permission key from `constants/permissions.ts` gating this route. UX only — see Security Considerations. */
  permission?: string;
  /** Storefront-only: must be logged in, any role (no `permission` check — customers hold none of the catalog's admin permissions). */
  requiresAuth?: boolean;
  /**
   * Escape hatch for the handful of routes with no clean permission-catalog match
   * (e.g. an Admin-only settings page with no `Permissions.*` equivalent).
   * Checked only when `permission` is unset.
   */
  allowedRoles?: readonly string[];
  layout: RouteLayout;
  /** True: reachable but intentionally absent from sidebar/search/breadcrumb (detail pages, dashboards' own index, aliases). */
  hidden?: boolean;
  /** Defaults to 'noindex' when omitted (D11). Only meaningful for layout 'storefront'. */
  seo?: RouteSeo;
  /**
   * Stable identifier for the generated `paths.<area>.<name>(...)` helper
   * (routes/route-paths.ts). Give every route a real inbound link one — skip
   * it for routes that are never `<Link to>`'d directly (pure `<Navigate>`
   * aliases, the layout's own `*` catch-all).
   */
  name?: string;
}

/** A path that only ever renders `<Navigate replace>` — legacy/English aliases, moved pages. */
export interface RedirectDef {
  /** Relative to the same layout mount point as the routes around it. */
  from: string;
  /** Absolute target path (what the browser ends up at). */
  to: string;
  layout: RouteLayout;
}
