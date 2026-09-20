import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { viLabel } from './backoffice-sidebar-menu-config';
import type { ResolvedMenuGroup } from './backoffice-menu-types';

interface BackofficeSidebarNavProps {
    groups: ResolvedMenuGroup[];
    collapsed: boolean;
    expandedGroups: string[];
    onToggleGroup: (id: string) => void;
    isActive: (path: string) => boolean;
    isGroupActive: (groupId: string) => boolean;
}

/**
 * Danh sách nhóm + mục của sidebar back office.
 *
 * Thứ bậc thị giác (design-guidelines §9.2) — hai cấp phải khác hẳn nhau, không cấp nào
 * "trôi nổi" giữa các nhóm:
 *   · NHÓM  = chữ 11px, HOA, giãn chữ, `text-fg-subtle`, không nền, không icon màu mè.
 *   · MỤC   = chữ 13px, thụt vào 12px, cao 36–40px, nằm trong khối thụt lề của nhóm.
 *
 * Mục đang chọn (§9.1): thanh 2px `bg-brand` bên trái + chữ `text-brand-text` +
 * nền `bg-brand-subtle` rất nhạt. TUYỆT ĐỐI không tô nền đỏ đặc.
 * Toàn bộ màu đi qua token — không còn ternary sáng/tối (§9.1).
 */
export const BackofficeSidebarNav = ({
    groups, collapsed, expandedGroups, onToggleGroup, isActive, isGroupActive,
}: BackofficeSidebarNavProps) => (
    <nav aria-label="Điều hướng quản trị" className="flex-1 overflow-y-auto scrollbar-hide px-2 py-3">
        <ul className="space-y-3">
            {groups.map(group => {
                const groupActive = isGroupActive(group.id);
                const isExpanded = expandedGroups.includes(group.id);
                const groupTitle = viLabel(group.title);
                const panelId = `bo-group-${group.id}`;

                return (
                    <li key={group.id}>
                        <button
                            type="button"
                            onClick={() => onToggleGroup(group.id)}
                            aria-expanded={isExpanded}
                            aria-controls={panelId}
                            title={collapsed ? groupTitle : undefined}
                            className={cn(
                                'w-full flex items-center gap-2 rounded-md px-2 py-1.5',
                                'text-2xs font-semibold uppercase tracking-[.08em]',
                                'transition-colors duration-140 ease-out hover:text-fg',
                                collapsed && 'justify-center',
                                groupActive ? 'text-fg-muted' : 'text-fg-subtle',
                            )}
                        >
                            <span className="shrink-0 text-fg-subtle" aria-hidden>{group.icon}</span>
                            {!collapsed && (
                                <>
                                    <span className="flex-1 text-left truncate">{groupTitle}</span>
                                    <ChevronDown
                                        size={12}
                                        aria-hidden
                                        className={cn(
                                            'shrink-0 transition-transform duration-220 ease-out motion-reduce:transition-none',
                                            isExpanded && 'rotate-180',
                                        )}
                                    />
                                </>
                            )}
                        </button>

                        <AnimatePresence initial={false}>
                            {(isExpanded || collapsed) && (
                                <motion.ul
                                    id={panelId}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                    className={cn(
                                        'overflow-hidden space-y-0.5',
                                        /* Thụt lề = tín hiệu "thuộc về nhóm trên"; dải kẻ mảnh làm rõ cấp. */
                                        !collapsed && 'mt-1 ml-3 border-l border-line pl-1',
                                        collapsed && 'mt-1',
                                    )}
                                >
                                    {group.items.map(item => {
                                        const active = isActive(item.path);
                                        const label = viLabel(item.title);
                                        return (
                                            <li key={item.path}>
                                                <Link
                                                    to={item.path}
                                                    title={collapsed ? label : undefined}
                                                    aria-current={active ? 'page' : undefined}
                                                    className={cn(
                                                        'relative flex items-center gap-2.5 rounded-md text-13',
                                                        'transition-colors duration-140 ease-out',
                                                        collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-2',
                                                        active
                                                            ? 'bg-brand-subtle font-semibold text-brand-text'
                                                            : 'text-fg-muted hover:bg-sunken hover:text-fg',
                                                        /* Thanh 2px bên trái — chỉ báo duy nhất được dùng màu đỏ. */
                                                        active && !collapsed &&
                                                            'before:absolute before:-left-1 before:top-1 before:bottom-1 before:w-0.5 before:rounded-full before:bg-brand',
                                                    )}
                                                >
                                                    <span
                                                        aria-hidden
                                                        className={cn(
                                                            'shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]',
                                                            active ? 'text-brand' : 'text-fg-subtle',
                                                        )}
                                                    >
                                                        {item.icon}
                                                    </span>
                                                    {!collapsed && (
                                                        <>
                                                            <span className="flex-1 truncate">{label}</span>
                                                            {item.badge ? (
                                                                <span className="num shrink-0 rounded-full bg-brand px-1.5 py-px text-2xs font-bold text-white">
                                                                    {item.badge}
                                                                </span>
                                                            ) : null}
                                                        </>
                                                    )}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </motion.ul>
                            )}
                        </AnimatePresence>
                    </li>
                );
            })}
        </ul>
    </nav>
);
