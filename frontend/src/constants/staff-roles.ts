/**
 * Danh sách vai trò "nhân viên" (staff) — bất kỳ ai giữ 1 trong các vai trò này
 * được coi là nhân viên và có quyền vào `/backoffice` (guard client-side, KHÔNG
 * thay cho việc phân quyền ở backend — xem "Security Considerations" trong
 * phase-07-w0-frontend-compile-critical.md).
 *
 * NGUỒN DUY NHẤT — trước đây danh sách này bị lặp lại (và không khớp nhau) ở
 * App.tsx (thiếu HR/InventoryStaff/Marketing → 3 role này bị văng khỏi
 * /backoffice), LoginPage.tsx, header-utility-bar.tsx. Giờ cả 3 chỗ import từ
 * đây.
 *
 * Khớp đúng tên role thật trong DB (AspNetRoles, xem thêm
 * `backend/BuildingBlocks/Security/Permissions.cs`) — KHÔNG có role tên
 * "Technician" chung chung, chỉ có TechnicianInShop/TechnicianOnSite.
 * "Customer" cố ý không nằm trong danh sách này (khách hàng không phải nhân viên).
 *
 * W1-8 sẽ thay thế constant "chặn cứng theo role" này bằng route manifest
 * theo permission — đây là bản vá tạm cho wave 0.
 */
export const STAFF_ROLES = [
    'Admin',
    'Manager',
    'Sale',
    'TechnicianInShop',
    'TechnicianOnSite',
    'Accountant',
    'Supplier',
    'Marketing',
    'HR',
    'InventoryStaff',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
