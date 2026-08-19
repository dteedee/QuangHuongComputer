// Raw (unresolved) backoffice menu config — used to type both the API response
// (systemConfigApi.backofficeMenu.getForUser) and the hardcoded fallback below.
// Icons are referenced by name (resolved via utils/icon-registry) so this file
// stays pure data with no JSX.
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

// Hardcoded fallback menu — used when API is unavailable or loading
export const FALLBACK_MENU: BackofficeMenuGroupConfig[] = [
    {
        id: 'sales', title: 'Kinh doanh', iconName: 'TrendingUp', colorClass: 'text-blue-500',
        items: [
            { title: 'Dashboard', iconName: 'LayoutDashboard', path: '/backoffice', allowedRoles: ['Admin', 'Manager', 'Sale'], description: 'Tổng quan hệ thống', badgeSource: null },
            { title: 'Bán hàng (POS)', iconName: 'Store', path: '/backoffice/pos', allowedRoles: ['Admin', 'Manager', 'Sale'], description: 'Quầy thu ngân', badgeSource: null },
            { title: 'Đơn hàng', iconName: 'Receipt', path: '/backoffice/orders', allowedRoles: ['Admin', 'Manager', 'Sale'], description: 'Quản lý đơn hàng', badgeSource: 'pendingOrders' },
            { title: 'Sản phẩm', iconName: 'Package', path: '/backoffice/products', allowedRoles: ['Admin', 'Manager'], description: 'Danh sách sản phẩm', badgeSource: null },
            { title: 'Danh mục', iconName: 'Archive', path: '/backoffice/categories', allowedRoles: ['Admin', 'Manager'], description: 'Phân loại sản phẩm', badgeSource: null },
            { title: 'Thương hiệu', iconName: 'Tag', path: '/backoffice/brands', allowedRoles: ['Admin', 'Manager'], description: 'Hãng sản xuất', badgeSource: null },
            { title: 'Kho hàng', iconName: 'Box', path: '/backoffice/inventory', allowedRoles: ['Admin', 'Manager', 'Supplier'], description: 'Quản lý tồn kho', badgeSource: null },
            { title: 'Nhà cung cấp', iconName: 'Building2', path: '/backoffice/inventory/suppliers', allowedRoles: ['Admin', 'Manager'], description: 'Quản lý NCC', badgeSource: null },
            { title: 'Đơn mua hàng', iconName: 'ShoppingCart', path: '/backoffice/inventory/purchase-orders', allowedRoles: ['Admin', 'Manager'], description: 'Đặt hàng NCC', badgeSource: null },
        ]
    },
    {
        id: 'service', title: 'Dịch vụ & Kỹ thuật', iconName: 'Wrench', colorClass: 'text-orange-500',
        items: [
            { title: 'Sửa chữa', iconName: 'Hammer', path: '/backoffice/tech', allowedRoles: ['Admin', 'Manager', 'TechnicianInShop', 'TechnicianOnSite'], description: 'Quản lý sửa chữa', badgeSource: null },
            { title: 'Bảo hành', iconName: 'ShieldCheck', path: '/backoffice/warranty', allowedRoles: ['Admin', 'Manager', 'TechnicianInShop'], description: 'Theo dõi bảo hành', badgeSource: null },
        ]
    },
    {
        id: 'finance_hr', title: 'Tài chính & Nhân sự', iconName: 'Calculator', colorClass: 'text-emerald-500',
        items: [
            { title: 'Tài chính', iconName: 'Wallet', path: '/backoffice/accounting', allowedRoles: ['Admin', 'Manager', 'Accountant'], description: 'Kế toán tài chính', badgeSource: null },
            { title: 'Nhân sự', iconName: 'Briefcase', path: '/backoffice/hr', allowedRoles: ['Admin', 'Manager', 'Accountant'], description: 'Quản lý nhân sự', badgeSource: null },
            { title: 'Tuyển dụng', iconName: 'UserCheck', path: '/backoffice/hr/recruitment', allowedRoles: ['Admin', 'Manager'], description: 'Tuyển dụng nhân viên', badgeSource: null },
        ]
    },
    {
        id: 'content', title: 'Nội dung & Marketing', iconName: 'Sparkles', colorClass: 'text-pink-500',
        items: [
            { title: 'Quản lý Nội dung', iconName: 'FileText', path: '/backoffice/cms', allowedRoles: ['Admin', 'Manager', 'Sale'], description: 'Bài viết & trang', badgeSource: null },
            { title: 'Homepage Builder', iconName: 'Sparkles', path: '/backoffice/homepage-builder', allowedRoles: ['Admin', 'Manager'], description: 'Xây dựng trang chủ', badgeSource: null },
            { title: 'Menu Manager', iconName: 'Menu', path: '/backoffice/menus', allowedRoles: ['Admin', 'Manager'], description: 'Quản lý menu', badgeSource: null },
            { title: 'Flash Sales', iconName: 'Zap', path: '/backoffice/flash-sales', allowedRoles: ['Admin', 'Manager'], description: 'Giảm giá chớp nhoáng', badgeSource: null },
            { title: 'Mã giảm giá', iconName: 'Ticket', path: '/backoffice/coupons', allowedRoles: ['Admin', 'Manager'], description: 'Voucher & coupon', badgeSource: null },
            { title: 'Đánh giá', iconName: 'Star', path: '/backoffice/reviews', allowedRoles: ['Admin', 'Manager'], description: 'Review sản phẩm', badgeSource: null },
        ]
    },
    {
        id: 'crm', title: 'CRM', iconName: 'Users', colorClass: 'text-violet-500',
        items: [
            { title: 'Tổng quan CRM', iconName: 'LayoutDashboard', path: '/backoffice/crm', allowedRoles: ['Admin', 'Manager', 'Sale'], description: 'Dashboard CRM', badgeSource: null },
            { title: 'Khách hàng', iconName: 'Users', path: '/backoffice/crm/customers', allowedRoles: ['Admin', 'Manager', 'Sale'], description: 'Quản lý khách hàng', badgeSource: null },
            { title: 'Leads', iconName: 'UserPlus', path: '/backoffice/crm/leads', allowedRoles: ['Admin', 'Manager', 'Sale'], description: 'Khách tiềm năng', badgeSource: null },
            { title: 'Pipeline', iconName: 'Target', path: '/backoffice/crm/leads/pipeline', allowedRoles: ['Admin', 'Manager', 'Sale'], description: 'Kanban leads', badgeSource: null },
            { title: 'Phân nhóm', iconName: 'ClipboardList', path: '/backoffice/crm/segments', allowedRoles: ['Admin', 'Manager'], description: 'Phân loại khách hàng', badgeSource: null },
            { title: 'Campaigns', iconName: 'Mail', path: '/backoffice/crm/campaigns', allowedRoles: ['Admin', 'Manager'], description: 'Email marketing', badgeSource: null },
        ]
    },
    {
        id: 'admin', title: 'Hệ thống', iconName: 'Settings', colorClass: 'text-gray-500',
        items: [
            { title: 'Người dùng', iconName: 'Users', path: '/backoffice/users', allowedRoles: ['Admin'], description: 'Quản lý tài khoản', badgeSource: null },
            { title: 'Vai trò & Quyền', iconName: 'Lock', path: '/backoffice/roles', allowedRoles: ['Admin'], description: 'Phân quyền', badgeSource: null },
            { title: 'Cấu hình', iconName: 'Settings', path: '/backoffice/config', allowedRoles: ['Admin'], description: 'Cài đặt hệ thống', badgeSource: null },
            { title: 'Trạng thái', iconName: 'Activity', path: '/backoffice/system-health', allowedRoles: ['Admin'], description: 'Health & Monitor', badgeSource: null },
            { title: 'Thanh toán SePay', iconName: 'CreditCard', path: '/backoffice/payments/sepay', allowedRoles: ['Admin'], description: 'Cấu hình & Giao dịch', badgeSource: null },
            { title: 'Báo cáo', iconName: 'BarChart3', path: '/backoffice/reports', allowedRoles: ['Admin', 'Manager'], description: 'Thống kê & báo cáo', badgeSource: null },
            { title: 'Nhật ký & Backup', iconName: 'Activity', path: '/backoffice/audit-logs', allowedRoles: ['Admin'], description: 'Log hoạt động & sao lưu', badgeSource: null },
            { title: 'Quản lý Menu', iconName: 'LayoutList', path: '/backoffice/admin/menu-editor', allowedRoles: ['Admin'], description: 'Chỉnh sửa menu backoffice', badgeSource: null },
        ]
    },
];
