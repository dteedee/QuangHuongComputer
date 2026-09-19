/**
 * Tài khoản seed dùng cho E2E.
 *
 * Bảo mật: đây là tài khoản DEMO chỉ tồn tại ở môi trường Development
 * (`backend/Services/Identity/IdentitySeeder.cs:29-38`). Mật khẩu ở đây là
 * **giá trị mặc định có tài liệu**, luôn đọc từ biến môi trường trước; không bao
 * giờ commit mật khẩu thật của staging/production vào thư mục này.
 */
export interface StaffAccount {
    /** Khoá env, ví dụ E2E_PW_ADMIN. */
    key: string;
    email: string;
    password: string;
    /** Tên role trong `AspNetRoles`. */
    role: string;
    /** Nhãn tiếng Việt để đặt tên test. */
    label: string;
}

function pw(key: string, fallback: string): string {
    return process.env[`E2E_PW_${key}`] ?? fallback;
}

function mail(key: string, fallback: string): string {
    return process.env[`E2E_MAIL_${key}`] ?? fallback;
}

/**
 * 8 tài khoản nhân viên phải vào được back-office.
 * Ba role từng bị đá thẳng về storefront (audit wave 0) — nếu một dòng ở đây
 * biến mất thì spec `role-access` phải đỏ, nên danh sách này được khẳng định
 * về số lượng trong chính spec đó.
 */
export const STAFF_ACCOUNTS: StaffAccount[] = [
    { key: 'ADMIN', email: mail('ADMIN', 'admin@quanghuong.com'), password: pw('ADMIN', 'Admin@123'), role: 'Admin', label: 'Quản trị' },
    { key: 'MANAGER', email: mail('MANAGER', 'manager@quanghuong.com'), password: pw('MANAGER', 'Manager@123'), role: 'Manager', label: 'Quản lý cửa hàng' },
    { key: 'SALE', email: mail('SALE', 'sale@quanghuong.com'), password: pw('SALE', 'Sale@123'), role: 'Sale', label: 'Bán hàng' },
    { key: 'KHO', email: mail('KHO', 'kho@quanghuong.com'), password: pw('KHO', 'Kho@123'), role: 'InventoryStaff', label: 'Kho' },
    { key: 'ACCOUNTANT', email: mail('ACCOUNTANT', 'accountant@quanghuong.com'), password: pw('ACCOUNTANT', 'Accountant@123'), role: 'Accountant', label: 'Kế toán' },
    { key: 'HR', email: mail('HR', 'hr@quanghuong.com'), password: pw('HR', 'Hr@123'), role: 'HR', label: 'Nhân sự' },
    { key: 'TECHNICIAN', email: mail('TECHNICIAN', 'technician@quanghuong.com'), password: pw('TECHNICIAN', 'Tech@123'), role: 'TechnicianInShop', label: 'Kỹ thuật viên' },
    { key: 'MARKETING', email: mail('MARKETING', 'marketing@quanghuong.com'), password: pw('MARKETING', 'Marketing@123'), role: 'Marketing', label: 'Marketing' },
];

/** Số role nhân viên bắt buộc — dùng để chốt danh sách trên không bị rút gọn âm thầm. */
export const EXPECTED_STAFF_COUNT = 8;

export const ADMIN_ACCOUNT = STAFF_ACCOUNTS[0];

/** Khách hàng seed sẵn (chỉ dùng để ĐỌC; mọi kịch bản ghi đều tự đăng ký tài khoản mới). */
export const SEEDED_CUSTOMER = {
    email: mail('CUSTOMER', 'customer@example.com'),
    password: pw('CUSTOMER', 'Customer@123'),
};
