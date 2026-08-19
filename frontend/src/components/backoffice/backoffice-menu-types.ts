import type { ReactNode } from 'react';
import type { BackofficeMenuItemConfig, BackofficeMenuGroupConfig } from './backoffice-sidebar-menu-config';

// Resolved menu item/group — icon name strings replaced with rendered JSX icons
// and badge counts resolved from live stats (e.g. pending orders).
export interface ResolvedMenuItem extends BackofficeMenuItemConfig {
    icon: ReactNode;
    badge?: number;
}

export interface ResolvedMenuGroup extends Omit<BackofficeMenuGroupConfig, 'items'> {
    icon: ReactNode;
    color: string;
    items: ResolvedMenuItem[];
}
