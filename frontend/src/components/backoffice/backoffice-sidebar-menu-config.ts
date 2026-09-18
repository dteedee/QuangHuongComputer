// Raw (unresolved) backoffice menu config — used to type both the API response
// (systemConfigApi.backofficeMenu.getForUser) and the generated fallback below.
// Icons are referenced by name (resolved via utils/icon-registry) so this file
// stays pure data with no JSX.
import { routes, fullPath } from '../../routes';
import { rolesForPermission } from '../../constants/permissions';
import { STAFF_ROLES } from '../../constants/staff-roles';

export interface BackofficeMenuItemConfig {
    title: string;
    iconName: string;
    path: string;
    allowedRoles: string[];
    description: string;
    badgeSource: string | null;
}

export interface BackofficeMenuGroupConfig {
    id: string;
    title: string;
    iconName: string;
    colorClass: string;
    items: BackofficeMenuItemConfig[];
}

/** Sidebar-group metadata that the route manifest has no place for (it's group-level, not
 *  per-route) — id must match a `RouteDef.group` used somewhere in `frontend/src/routes/*.ts`. */
const GROUP_META: Record<string, { title: string; iconName: string; colorClass: string }> = {
    sales: { title: 'Kinh doanh', iconName: 'TrendingUp', colorClass: 'text-blue-500' },
    service: { title: 'Dịch vụ & Kỹ thuật', iconName: 'Wrench', colorClass: 'text-orange-500' },
    finance_hr: { title: 'Tài chính & Nhân sự', iconName: 'Calculator', colorClass: 'text-emerald-500' },
    content: { title: 'Nội dung & Marketing', iconName: 'Sparkles', colorClass: 'text-pink-500' },
    crm: { title: 'CRM', iconName: 'Users', colorClass: 'text-violet-500' },
    admin: { title: 'Hệ thống', iconName: 'Settings', colorClass: 'text-gray-500' },
};

const GROUP_ORDER = ['sales', 'service', 'finance_hr', 'content', 'crm', 'admin'];

/**
 * The fallback (non-DB) backoffice sidebar menu — GENERATED from the route manifest
 * (`frontend/src/routes/*.ts`), not hand-typed (phase-17 Implementation Step 4: "Generate the
 * sidebar ... from the manifest"). A route becomes a menu item when it has a `group` + `title`
 * and is not `hidden`. `allowedRoles` comes from the route's `permission` (via the W1-1 catalog)
 * or its `allowedRoles` escape hatch; a grouped+visible route with neither (rare — see
 * `admin-orders.routes.ts`) falls back to "any staff".
 *
 * `systemConfigApi.backofficeMenu.getForUser()` (DB-driven) still overrides this at runtime when
 * it responds (`use-backoffice-menu.ts`) — reseeding `BackofficeMenuItems` FROM this manifest is
 * W2-2's job (integration request, see reports/integration-requests-w1.md); until then the two
 * can disagree, exactly like today.
 */
function buildFallbackMenu(): BackofficeMenuGroupConfig[] {
    return GROUP_ORDER.map((groupId) => {
        const meta = GROUP_META[groupId];
        const items: BackofficeMenuItemConfig[] = routes
            .filter((route) => route.layout === 'backoffice' && route.group === groupId && !route.hidden && route.title)
            .map((route) => ({
                title: route.title as string,
                iconName: route.icon ?? 'Circle',
                path: fullPath(route),
                allowedRoles: route.permission
                    ? [...rolesForPermission(route.permission)]
                    : route.allowedRoles
                        ? [...route.allowedRoles]
                        : [...STAFF_ROLES],
                description: route.description ?? '',
                badgeSource: route.badgeSource ?? null,
            }));
        return { id: groupId, title: meta.title, iconName: meta.iconName, colorClass: meta.colorClass, items };
    }).filter((group) => group.items.length > 0);
}

export const FALLBACK_MENU: BackofficeMenuGroupConfig[] = buildFallbackMenu();
