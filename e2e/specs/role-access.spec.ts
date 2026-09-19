import { test, expect, loginThroughUi } from '../fixtures/test-base';
import { STAFF_ACCOUNTS, EXPECTED_STAFF_COUNT, SEEDED_CUSTOMER } from '../fixtures/accounts';

/**
 * Audit wave 0: ba role nhân viên đăng nhập xong bị đá thẳng về storefront, và
 * Marketing vào back-office thì menu trống. Đây là spec canh đúng chuyện đó.
 *
 * Chỉ ĐỌC: không tạo, sửa, xoá bất kỳ tài khoản/role nào. (Một agent audit từng
 * xoá role `Admin` khi "thử xem có bị chặn không" — bộ test này không bao giờ
 * gọi một endpoint ghi nào lên users/roles.)
 */

// Không dùng serial: một role hỏng không được che khuất kết quả của các role còn lại.
// workers=1 đã đảm bảo chạy tuần tự.

test('danh sách role nhân viên không bị rút gọn âm thầm', () => {
    // Nếu ai đó bỏ HR ra khỏi `accounts.ts`, test này đỏ ngay — tiêu chí nghiệm thu
    // của phase-36 ("bỏ HR khỏi danh sách ⇒ spec role-access phải fail").
    expect(STAFF_ACCOUNTS).toHaveLength(EXPECTED_STAFF_COUNT);
    const roles = STAFF_ACCOUNTS.map((a) => a.role).sort();
    expect(roles).toEqual(
        ['Accountant', 'Admin', 'HR', 'InventoryStaff', 'Manager', 'Marketing', 'Sale', 'TechnicianInShop'].sort(),
    );
});

/**
 * ĐANG HỎNG (đo 2026-09-19, IR w4#02): `BackofficeMenuSeeder.cs` không nhắc tới
 * `InventoryStaff` và `HR` ở bất kỳ mục nào, nên `config.BackofficeMenuItems`
 * có 0 dòng cho hai role này ⇒ vào được /backoffice nhưng sidebar trống, kèm toast
 * "Bạn không có quyền thực hiện thao tác này". Hai test dưới đây đỏ là ĐÚNG.
 */
const ROLES_WITH_EMPTY_MENU = new Set(['InventoryStaff', 'HR']);

for (const account of STAFF_ACCOUNTS) {
    const knownBug = ROLES_WITH_EMPTY_MENU.has(account.role) ? ' @known-bug' : '';
    test(`${account.label} (${account.role}) vào được back-office và thấy menu${knownBug}`, async ({ page }) => {
        await loginThroughUi(page, account.email, account.password);
        await page.goto('/backoffice');

        // 1. Không bị đá về storefront hay về /login.
        await expect(page).toHaveURL(/\/backoffice/);

        // 2. Sidebar tồn tại và KHÔNG rỗng. Lỗi thật đã gặp: Marketing bị loại khỏi
        //    mọi mục nav nên sidebar trắng trơn dù vẫn vào được /backoffice.
        const sidebar = page.locator('aside').first();
        await expect(sidebar).toBeVisible();
        const groups = sidebar.getByRole('button');
        const groupCount = await groups.count();
        expect(groupCount, `${account.role}: sidebar không có nhóm menu nào`).toBeGreaterThan(0);

        // 3. Mở lần lượt các nhóm cho tới khi thấy một mục dẫn vào /backoffice —
        //    chứng minh role này thực sự có màn hình để làm việc, không chỉ có cái khung.
        const backofficeLinks = sidebar.locator('a[href^="/backoffice"]');
        for (let i = 0; i < groupCount && (await backofficeLinks.count()) === 0; i++) {
            await groups.nth(i).click();
            await page.waitForTimeout(200);
        }
        expect(
            await backofficeLinks.count(),
            `${account.role}: mở hết ${groupCount} nhóm menu vẫn không có mục /backoffice nào`,
        ).toBeGreaterThan(0);
    });
}

test('khách hàng vào /backoffice nhận trang từ chối, không phải màn hình trắng', async ({ page }) => {
    await loginThroughUi(page, SEEDED_CUSTOMER.email, SEEDED_CUSTOMER.password);
    await page.goto('/backoffice');

    // Không được rơi vào back-office.
    await expect(page).not.toHaveURL(/\/backoffice\/(?!$)/);

    // Và phải có nội dung nhìn thấy được giải thích lý do (403 / không có quyền),
    // chứ không phải <body> rỗng.
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
    await expect(
        page.getByText(/403|không có quyền|Không đủ quyền|từ chối truy cập|đăng nhập/i).first(),
    ).toBeVisible();
});
