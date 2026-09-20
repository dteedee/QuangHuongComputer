import { Fragment } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { viLabel } from './backoffice-sidebar-menu-config';
import type { ResolvedMenuGroup } from './backoffice-menu-types';

interface BackofficeBreadcrumbProps {
    groups: ResolvedMenuGroup[];
    isActive: (path: string) => boolean;
}

/**
 * Từ điển cho đoạn đường dẫn không khớp mục menu nào (trang con: /edit, /new, /:id…).
 * Trước đây đoạn này bị "Title Case hoá" thô: `/backoffice/products/new` ra "New".
 */
const SEGMENT_LABELS: Record<string, string> = {
    new: 'Thêm mới',
    create: 'Thêm mới',
    edit: 'Chỉnh sửa',
    detail: 'Chi tiết',
    details: 'Chi tiết',
    view: 'Chi tiết',
    settings: 'Cấu hình',
    import: 'Nhập dữ liệu',
    export: 'Xuất dữ liệu',
    print: 'In',
    report: 'Báo cáo',
    reports: 'Báo cáo',
};

/** Đoạn cuối là mã/ID (uuid, số, mã đơn) thì hiển thị nguyên văn, không dịch. */
const labelForSegment = (segment: string): string => {
    const key = segment.toLowerCase();
    if (SEGMENT_LABELS[key]) return SEGMENT_LABELS[key];
    if (/^[0-9a-f-]{8,}$/i.test(segment) || /^\d+$/.test(segment)) return segment;
    return viLabel(segment.replace(/-/g, ' '));
};

/**
 * Breadcrumb back office: "Quản trị › {Nhóm} › {Trang}".
 *
 * Mọi nhãn đi qua `viLabel()` nên nhãn tiếng Anh đến từ DB (`BackofficeMenuItems`) cũng
 * ra tiếng Việt (design-guidelines §9.5). Màu lấy từ token, không ternary sáng/tối (§9.1).
 */
export const BackofficeBreadcrumb = ({ groups, isActive }: BackofficeBreadcrumbProps) => {
    const location = useLocation();
    const isRoot = location.pathname === '/backoffice';

    const group = groups.find(g => g.items.some(i => isActive(i.path) && i.path !== '/backoffice'));
    const item = group?.items.find(i => isActive(i.path) && i.path !== '/backoffice');

    /* Trang con nằm dưới một mục menu (ví dụ /products/new) — thêm một bậc nữa. */
    const leaf = item && location.pathname !== item.path
        ? labelForSegment(location.pathname.slice(item.path.length + 1).split('/')[0] ?? '')
        : undefined;

    const trail: { label: string; to?: string }[] = [];
    if (group) trail.push({ label: viLabel(group.title) });
    if (item) trail.push({ label: viLabel(item.title), to: leaf ? item.path : undefined });
    else if (!isRoot) trail.push({ label: labelForSegment(location.pathname.split('/').pop() ?? '') });
    if (leaf) trail.push({ label: leaf });

    return (
        <nav aria-label="Đường dẫn" className="hidden md:block min-w-0">
            <ol className="flex items-center gap-1.5 text-13">
                <li className={cn('truncate', isRoot ? 'font-semibold text-fg' : 'text-fg-muted')}>
                    {isRoot ? 'Quản trị' : <Link to="/backoffice" className="hover:text-fg">Quản trị</Link>}
                </li>
                {trail.map((crumb, i) => {
                    const last = i === trail.length - 1;
                    return (
                        <Fragment key={`${crumb.label}-${i}`}>
                            <li aria-hidden className="text-fg-subtle">
                                <ChevronRight size={13} />
                            </li>
                            <li
                                aria-current={last ? 'page' : undefined}
                                className={cn('truncate', last ? 'font-semibold text-fg' : 'text-fg-muted')}
                            >
                                {crumb.to ? (
                                    <Link to={crumb.to} className="hover:text-fg">{crumb.label}</Link>
                                ) : (
                                    crumb.label
                                )}
                            </li>
                        </Fragment>
                    );
                })}
            </ol>
        </nav>
    );
};
