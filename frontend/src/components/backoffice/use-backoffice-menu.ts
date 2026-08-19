import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { systemConfigApi } from '../../api/systemConfig';
import { salesApi } from '../../api/sales';
import { usePermissions } from '../../hooks/usePermissions';
import { getIcon } from '../../utils/icon-registry';
import { FALLBACK_MENU } from './backoffice-sidebar-menu-config';
import type { ResolvedMenuGroup } from './backoffice-menu-types';

/**
 * Fetches the backoffice menu (API-driven, falls back to hardcoded config),
 * resolves icons + badge counts, filters by the current user's roles, and
 * tracks which groups are expanded / which route is active.
 */
export const useBackofficeMenu = () => {
    const location = useLocation();
    const { hasAnyRole } = usePermissions();
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [initialized, setInitialized] = useState(false);

    const { data: salesStats } = useQuery({
        queryKey: ['sales-stats-badge'],
        queryFn: () => salesApi.admin.getStats(),
        staleTime: 60000,
    });

    // Fetch dynamic menu from DB; fall back to hardcoded if unavailable
    const { data: dynamicMenu } = useQuery({
        queryKey: ['backoffice-menu'],
        queryFn: () => systemConfigApi.backofficeMenu.getForUser(),
        staleTime: 5 * 60 * 1000, // 5 min — menu changes rarely
        retry: 1,
    });

    const pendingCount = salesStats?.pendingOrders || 0;

    const rawMenuGroups = dynamicMenu
        ? dynamicMenu.map(g => ({
            id: g.id,
            title: g.title,
            iconName: g.iconName,
            colorClass: g.colorClass,
            items: g.items.map(i => ({
                title: i.title,
                iconName: i.iconName,
                path: i.path,
                allowedRoles: i.allowedRoles,
                description: i.description ?? '',
                badgeSource: i.badgeSource ?? null,
            })),
        }))
        : FALLBACK_MENU;

    const menuGroups: ResolvedMenuGroup[] = rawMenuGroups.map(g => ({
        ...g,
        icon: getIcon(g.iconName, 16),
        color: g.colorClass,
        items: g.items.map(i => ({
            ...i,
            icon: getIcon(i.iconName, 20),
            badge: i.badgeSource === 'pendingOrders' && pendingCount > 0 ? pendingCount : undefined,
        })),
    }));

    const filteredGroups: ResolvedMenuGroup[] = menuGroups
        .map(g => ({ ...g, items: g.items.filter(i => hasAnyRole(i.allowedRoles)) }))
        .filter(g => g.items.length > 0);

    // Check if a menu item is active (exact match or parent route).
    // Priority: exact match > prefix match (only if no more specific match exists)
    const isActive = (path: string) => {
        const currentPath = location.pathname;
        if (path === '/backoffice') return currentPath === '/backoffice';
        if (currentPath === path) return true;
        if (currentPath.startsWith(path + '/')) {
            const allMenuPaths = filteredGroups.flatMap(g => g.items.map(i => i.path));
            const hasMoreSpecificMatch = allMenuPaths.some(menuPath =>
                menuPath !== path &&
                menuPath.startsWith(path + '/') &&
                (currentPath === menuPath || currentPath.startsWith(menuPath + '/'))
            );
            return !hasMoreSpecificMatch;
        }
        return false;
    };

    const isGroupActive = (groupId: string) => {
        const group = filteredGroups.find(g => g.id === groupId);
        return group ? group.items.some(item => isActive(item.path)) : false;
    };

    // Auto-expand the group containing the current route
    useEffect(() => {
        const currentPath = location.pathname;
        const groupsToExpand = filteredGroups
            .filter(group => group.items.some(item => currentPath === item.path || currentPath.startsWith(item.path + '/')))
            .map(group => group.id);

        if (!initialized) {
            setExpandedGroups(groupsToExpand.length > 0 ? groupsToExpand : ['sales']);
            setInitialized(true);
        } else {
            setExpandedGroups(prev => {
                const next = [...prev];
                groupsToExpand.forEach(g => { if (!next.includes(g)) next.push(g); });
                return next;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, initialized]);

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const allItems = filteredGroups.flatMap(g => g.items.map(i => ({ ...i, group: g.title })));

    return {
        filteredGroups,
        allItems,
        expandedGroups,
        toggleGroup,
        isActive,
        isGroupActive,
        pendingCount,
        salesStats,
    };
};
