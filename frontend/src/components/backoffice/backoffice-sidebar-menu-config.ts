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

/* ------------------------------------------------------------------------- */
/* Việt hoá nhãn (design-guidelines §9.5)                                     */
/* ------------------------------------------------------------------------- */

/**
 * Nhãn menu/breadcrumb phải tiếng Việt toàn bộ, không trộn Việt–Anh.
 *
 * Bảng này là lớp dịch DUY NHẤT và cố tình đặt ở tầng hiển thị, vì nhãn đến từ HAI nguồn:
 *   1. manifest route (`routes/*.ts`) — qua `buildFallbackMenu()` ở trên;
 *   2. bảng DB `BackofficeMenuItems` — `use-backoffice-menu.ts` đè lên fallback khi API trả về.
 * Không sửa được nguồn 2 từ frontend, nên `viLabel()` được gọi ngay tại chỗ render
 * (`backoffice-sidebar-nav`, `backoffice-breadcrumb`) để cả hai nguồn đều ra tiếng Việt.
 *
 * Giữ nguyên thuật ngữ đã chuẩn ngành, không có từ Việt gọn hơn: SKU, POS, CRM, RFQ, VAT.
 * Khoá tra cứu không phân biệt hoa/thường + khoảng trắng thừa.
 */
const VI_LABEL_OVERRIDES: Record<string, string> = {
    /* --- nhãn tiếng Anh còn sót trong manifest route ----------------------- */
    'homepage builder': 'Trình dựng trang chủ',
    'menu manager': 'Quản lý menu',
    'quản lý menu': 'Quản lý menu',        // chuẩn hoá hoa/thường
    'quản lý nội dung': 'Quản lý nội dung',
    'flash sales': 'Giờ vàng',
    'flash sale': 'Giờ vàng',
    campaigns: 'Chiến dịch',
    campaign: 'Chiến dịch',
    leads: 'Khách tiềm năng',
    lead: 'Khách tiềm năng',
    pipeline: 'Phễu bán hàng',

    /* --- nhãn tiếng Anh có thể đến từ DB ----------------------------------- */
    dashboard: 'Tổng quan',
    overview: 'Tổng quan',
    settings: 'Cấu hình',
    configuration: 'Cấu hình',
    users: 'Người dùng',
    'user management': 'Người dùng',
    roles: 'Vai trò & quyền',
    'roles & permissions': 'Vai trò & quyền',
    permissions: 'Vai trò & quyền',
    products: 'Sản phẩm',
    product: 'Sản phẩm',
    categories: 'Danh mục',
    category: 'Danh mục',
    brands: 'Thương hiệu',
    suppliers: 'Nhà cung cấp',
    inventory: 'Kho hàng',
    stock: 'Kho hàng',
    'purchase orders': 'Đơn mua hàng',
    orders: 'Đơn hàng',
    order: 'Đơn hàng',
    returns: 'Đổi trả',
    customers: 'Khách hàng',
    reviews: 'Đánh giá',
    reports: 'Báo cáo',
    report: 'Báo cáo',
    coupons: 'Mã giảm giá',
    vouchers: 'Mã giảm giá',
    promotions: 'Khuyến mãi',
    banners: 'Ảnh quảng cáo',
    blog: 'Bài viết',
    posts: 'Bài viết',
    pages: 'Trang nội dung',
    media: 'Thư viện ảnh',
    warranty: 'Bảo hành',
    repairs: 'Sửa chữa',
    technicians: 'Kỹ thuật viên',
    tasks: 'Công việc',
    branches: 'Chi nhánh',
    payroll: 'Chạy lương',
    recruitment: 'Tuyển dụng',
    employees: 'Nhân sự',
    finance: 'Tài chính',
    accounting: 'Tài chính',
    loyalty: 'Điểm thưởng',
    'audit log': 'Nhật ký hệ thống',
    logs: 'Nhật ký hệ thống',
    backup: 'Sao lưu',
    notifications: 'Thông báo',
    'contact inbox': 'Hộp thư liên hệ',
    inbox: 'Hộp thư liên hệ',

    /* --- tên nhóm ----------------------------------------------------------- */
    sales: 'Kinh doanh',
    service: 'Dịch vụ & Kỹ thuật',
    'service & technical': 'Dịch vụ & Kỹ thuật',
    'finance & hr': 'Tài chính & Nhân sự',
    'content & marketing': 'Nội dung & Marketing',
    content: 'Nội dung & Marketing',
    marketing: 'Nội dung & Marketing',
    system: 'Hệ thống',
    admin: 'Hệ thống',
    administration: 'Hệ thống',
};

/** Trả nhãn tiếng Việt cho một tiêu đề menu/breadcrumb. Không có trong bảng thì giữ nguyên. */
export function viLabel(title: string): string {
    if (!title) return title;
    return VI_LABEL_OVERRIDES[title.trim().toLowerCase()] ?? title;
}

/** Menu dự phòng, nhãn đã Việt hoá. Khai báo CUỐI file vì phụ thuộc `VI_LABEL_OVERRIDES`. */
export const FALLBACK_MENU: BackofficeMenuGroupConfig[] = buildFallbackMenu().map((group) => ({
    ...group,
    title: viLabel(group.title),
    items: group.items.map((item) => ({ ...item, title: viLabel(item.title) })),
}));
