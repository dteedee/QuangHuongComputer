using SystemConfig.Domain;
using SystemConfig.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace SystemConfig.Infrastructure.Data;

/// <summary>
/// The backoffice sidebar. Rows are reference data: a role that is not listed in
/// <c>AllowedRoles</c> sees no link at all, so a missing role here is a staff member staring at
/// an empty shell even when every route guard and every API already lets them in.
/// </summary>
public static class BackofficeMenuSeeder
{
    /// <summary>
    /// Integration request #55 (W0 gate): the "Nội dung &amp; Marketing" group excluded the
    /// <c>Marketing</c> role from every one of its items, so <c>marketing@</c> reached all six
    /// pages through the router and got 200 from all six admin APIs while the sidebar rendered
    /// nothing. Backfill applies ONLY where the stored value still equals the previously seeded
    /// value, so an administrator's own edit in the menu editor is never overwritten.
    ///
    /// Deliberately NOT extended to custom-fields / form-builder / automation-rules: those call
    /// <c>/api/config/*</c>, which is Admin-only and returns 403 for Marketing.
    /// </summary>
    private static readonly (string Path, string[] Was, string[] Now)[] RoleBackfill =
    {
        ("/backoffice",                     new[]{"Admin","Manager","Sale"}, new[]{"Admin","Manager","Sale","Marketing"}),
        ("/backoffice/cms",                 new[]{"Admin","Manager","Sale"}, new[]{"Admin","Manager","Sale","Marketing"}),
        ("/backoffice/homepage-builder",    new[]{"Admin","Manager"},        new[]{"Admin","Manager","Marketing"}),
        ("/backoffice/menus",               new[]{"Admin","Manager"},        new[]{"Admin","Manager","Marketing"}),
        ("/backoffice/flash-sales",         new[]{"Admin","Manager"},        new[]{"Admin","Manager","Marketing"}),
        ("/backoffice/coupons",             new[]{"Admin","Manager"},        new[]{"Admin","Manager","Marketing"}),
        ("/backoffice/promotions",          new[]{"Admin","Manager"},        new[]{"Admin","Manager","Marketing"}),
    };

    /// <returns>Number of rows created or changed. 0 means the menu is already correct.</returns>
    public static async Task<int> SeedAsync(SystemConfigDbContext context, CancellationToken ct = default)
    {
        var changes = await SeedGroupsAsync(context, ct);
        changes += await ApplyRoleBackfillAsync(context, ct);
        return changes;
    }

    /// <summary>
    /// Re-runs safely: a group is inserted only when its deterministic id is absent, and a single
    /// missing item is inserted into an existing group by <c>Path</c>. The previous version bailed
    /// out entirely as soon as ANY group existed, which is why a later menu addition could never
    /// reach a database that had already been seeded once.
    /// </summary>
    private static async Task<int> SeedGroupsAsync(SystemConfigDbContext context, CancellationToken ct)
    {
        var groups = BuildGroups();
        var existing = await context.BackofficeMenuGroups
            .Include(g => g.Items)
            .ToDictionaryAsync(g => g.Id, ct);

        var changes = 0;

        foreach (var group in groups)
        {
            if (!existing.TryGetValue(group.Id, out var current))
            {
                context.BackofficeMenuGroups.Add(group);
                changes++;
                continue;
            }

            var paths = current.Items.Select(i => i.Path).ToHashSet();
            foreach (var item in group.Items.Where(i => !paths.Contains(i.Path)))
            {
                item.GroupId = current.Id;
                context.BackofficeMenuItems.Add(item);
                changes++;
            }
        }

        if (changes > 0) await context.SaveChangesAsync(ct);
        return changes;
    }

    private static async Task<int> ApplyRoleBackfillAsync(SystemConfigDbContext context, CancellationToken ct)
    {
        var paths = RoleBackfill.Select(b => b.Path).ToList();
        var items = await context.BackofficeMenuItems.Where(i => paths.Contains(i.Path)).ToListAsync(ct);
        var changes = 0;

        foreach (var item in items)
        {
            var rule = RoleBackfill.First(b => b.Path == item.Path);
            var roles = (item.AllowedRoles ?? new List<string>()).OrderBy(r => r).ToList();

            if (roles.SequenceEqual(rule.Now.OrderBy(r => r))) continue;
            if (!roles.SequenceEqual(rule.Was.OrderBy(r => r))) continue; // admin edited it

            item.AllowedRoles = rule.Now.ToList();
            changes++;
        }

        if (changes > 0) await context.SaveChangesAsync(ct);
        return changes;
    }

    private static List<BackofficeMenuGroup> BuildGroups()
    {
        return new List<BackofficeMenuGroup>
        {
            new()
            {
                Id = Guid.Parse("11111111-0000-0000-0000-000000000001"),
                Title = "Kinh doanh",
                IconName = "TrendingUp",
                ColorClass = "text-blue-500",
                DisplayOrder = 0,
                IsActive = true,
                Items = new List<BackofficeMenuItem>
                {
                    new() { Title = "Dashboard",        IconName = "LayoutDashboard", Path = "/backoffice",                                AllowedRoles = ["Admin","Manager","Sale","Marketing"],                   DisplayOrder = 0, Description = "Tổng quan hệ thống" },
                    new() { Title = "Bán hàng (POS)",   IconName = "Store",           Path = "/backoffice/pos",                            AllowedRoles = ["Admin","Manager","Sale"],                               DisplayOrder = 1, Description = "Quầy thu ngân" },
                    new() { Title = "Đơn hàng",         IconName = "Receipt",         Path = "/backoffice/orders",                         AllowedRoles = ["Admin","Manager","Sale"],                               DisplayOrder = 2, Description = "Quản lý đơn hàng", BadgeSource = "pendingOrders" },
                    new() { Title = "Sản phẩm",         IconName = "Package",         Path = "/backoffice/products",                       AllowedRoles = ["Admin","Manager"],                                     DisplayOrder = 3, Description = "Danh sách sản phẩm" },
                    new() { Title = "Danh mục",         IconName = "Archive",         Path = "/backoffice/categories",                     AllowedRoles = ["Admin","Manager"],                                     DisplayOrder = 4, Description = "Phân loại sản phẩm" },
                    new() { Title = "Thương hiệu",      IconName = "Tag",             Path = "/backoffice/brands",                         AllowedRoles = ["Admin","Manager"],                                     DisplayOrder = 5, Description = "Hãng sản xuất" },
                    new() { Title = "Kho hàng",         IconName = "Box",             Path = "/backoffice/inventory",                      AllowedRoles = ["Admin","Manager","Supplier"],                          DisplayOrder = 6, Description = "Quản lý tồn kho" },
                    // Chuyển kho ngay dưới "Kho hàng". Seeder chỉ chèn dòng còn thiếu theo Path, nên DB đã seed cũng nhận được mục này.
                    new() { Title = "Chuyển kho",       IconName = "ArrowRightLeft",  Path = "/backoffice/inventory/transfers",             AllowedRoles = ["Admin","Manager","InventoryStaff"],                   DisplayOrder = 6, Description = "Phiếu chuyển hàng giữa các kho" },
                    new() { Title = "Nhà cung cấp",     IconName = "Building2",       Path = "/backoffice/inventory/suppliers",             AllowedRoles = ["Admin","Manager"],                                     DisplayOrder = 7, Description = "Quản lý NCC" },
                    new() { Title = "Đơn mua hàng",     IconName = "ShoppingCart",    Path = "/backoffice/inventory/purchase-orders",       AllowedRoles = ["Admin","Manager"],                                     DisplayOrder = 8, Description = "Đặt hàng NCC" },
                }
            },
            new()
            {
                Id = Guid.Parse("11111111-0000-0000-0000-000000000002"),
                Title = "Dịch vụ & Kỹ thuật",
                IconName = "Wrench",
                ColorClass = "text-orange-500",
                DisplayOrder = 1,
                IsActive = true,
                Items = new List<BackofficeMenuItem>
                {
                    new() { Title = "Sửa chữa", IconName = "Hammer",      Path = "/backoffice/tech",     AllowedRoles = ["Admin","Manager","TechnicianInShop","TechnicianOnSite"], DisplayOrder = 0, Description = "Quản lý sửa chữa" },
                    new() { Title = "Bảo hành", IconName = "ShieldCheck", Path = "/backoffice/warranty", AllowedRoles = ["Admin","Manager","TechnicianInShop"],                   DisplayOrder = 1, Description = "Theo dõi bảo hành" },
                }
            },
            new()
            {
                Id = Guid.Parse("11111111-0000-0000-0000-000000000003"),
                Title = "Tài chính & Nhân sự",
                IconName = "Calculator",
                ColorClass = "text-emerald-500",
                DisplayOrder = 2,
                IsActive = true,
                Items = new List<BackofficeMenuItem>
                {
                    new() { Title = "Tài chính", IconName = "Wallet",     Path = "/backoffice/accounting",         AllowedRoles = ["Admin","Manager","Accountant"], DisplayOrder = 0, Description = "Kế toán tài chính" },
                    new() { Title = "Nhân sự",   IconName = "Briefcase",  Path = "/backoffice/hr",                 AllowedRoles = ["Admin","Manager","Accountant"], DisplayOrder = 1, Description = "Quản lý nhân sự" },
                    new() { Title = "Tuyển dụng", IconName = "UserCheck", Path = "/backoffice/hr/recruitment",     AllowedRoles = ["Admin","Manager"],             DisplayOrder = 2, Description = "Tuyển dụng nhân viên" },
                }
            },
            new()
            {
                Id = Guid.Parse("11111111-0000-0000-0000-000000000004"),
                Title = "Nội dung & Marketing",
                IconName = "Sparkles",
                ColorClass = "text-pink-500",
                DisplayOrder = 3,
                IsActive = true,
                Items = new List<BackofficeMenuItem>
                {
                    // Marketing is present here per integration request #55 — the routes and the
                    // admin APIs already allow it (ContentEndpoints.cs:281-282, PromotionEndpoints.cs:21-23).
                    new() { Title = "Quản lý Nội dung", IconName = "FileText",  Path = "/backoffice/cms",                 AllowedRoles = ["Admin","Manager","Sale","Marketing"], DisplayOrder = 0, Description = "Bài viết & trang" },
                    new() { Title = "Homepage Builder",  IconName = "Sparkles",  Path = "/backoffice/homepage-builder",    AllowedRoles = ["Admin","Manager","Marketing"],        DisplayOrder = 1, Description = "Xây dựng trang chủ" },
                    new() { Title = "Menu Manager",      IconName = "Menu",      Path = "/backoffice/menus",               AllowedRoles = ["Admin","Manager","Marketing"],        DisplayOrder = 2, Description = "Quản lý menu" },
                    new() { Title = "Flash Sales",       IconName = "Zap",       Path = "/backoffice/flash-sales",         AllowedRoles = ["Admin","Manager","Marketing"],        DisplayOrder = 3, Description = "Giảm giá chớp nhoáng" },
                    new() { Title = "Mã giảm giá",       IconName = "Ticket",    Path = "/backoffice/coupons",             AllowedRoles = ["Admin","Manager","Marketing"],        DisplayOrder = 4, Description = "Voucher & coupon" },
                    new() { Title = "Khuyến mãi",        IconName = "Percent",   Path = "/backoffice/promotions",          AllowedRoles = ["Admin","Manager","Marketing"],        DisplayOrder = 5, Description = "Chương trình khuyến mãi" },
                    new() { Title = "Đánh giá",          IconName = "Star",      Path = "/backoffice/reviews",             AllowedRoles = ["Admin","Manager"],                    DisplayOrder = 6, Description = "Review sản phẩm" },
                }
            },
            new()
            {
                Id = Guid.Parse("11111111-0000-0000-0000-000000000005"),
                Title = "CRM",
                IconName = "Users",
                ColorClass = "text-violet-500",
                DisplayOrder = 4,
                IsActive = true,
                Items = new List<BackofficeMenuItem>
                {
                    new() { Title = "Tổng quan CRM", IconName = "LayoutDashboard", Path = "/backoffice/crm",                AllowedRoles = ["Admin","Manager","Sale"], DisplayOrder = 0, Description = "Dashboard CRM" },
                    new() { Title = "Khách hàng",    IconName = "Users",           Path = "/backoffice/crm/customers",      AllowedRoles = ["Admin","Manager","Sale"], DisplayOrder = 1, Description = "Quản lý khách hàng" },
                    new() { Title = "Leads",         IconName = "UserPlus",        Path = "/backoffice/crm/leads",          AllowedRoles = ["Admin","Manager","Sale"], DisplayOrder = 2, Description = "Khách tiềm năng" },
                    new() { Title = "Pipeline",      IconName = "Target",          Path = "/backoffice/crm/leads/pipeline", AllowedRoles = ["Admin","Manager","Sale"], DisplayOrder = 3, Description = "Kanban leads" },
                    new() { Title = "Phân nhóm",     IconName = "ClipboardList",   Path = "/backoffice/crm/segments",       AllowedRoles = ["Admin","Manager"],        DisplayOrder = 4, Description = "Phân loại khách hàng" },
                    new() { Title = "Campaigns",     IconName = "Mail",            Path = "/backoffice/crm/campaigns",      AllowedRoles = ["Admin","Manager"],        DisplayOrder = 5, Description = "Email marketing" },
                }
            },
            new()
            {
                Id = Guid.Parse("11111111-0000-0000-0000-000000000006"),
                Title = "Hệ thống",
                IconName = "Settings",
                ColorClass = "text-gray-500",
                DisplayOrder = 5,
                IsActive = true,
                Items = new List<BackofficeMenuItem>
                {
                    new() { Title = "Người dùng",        IconName = "Users",       Path = "/backoffice/users",               AllowedRoles = ["Admin"],           DisplayOrder = 0, Description = "Quản lý tài khoản" },
                    new() { Title = "Vai trò & Quyền",   IconName = "Lock",        Path = "/backoffice/roles",               AllowedRoles = ["Admin"],           DisplayOrder = 1, Description = "Phân quyền" },
                    new() { Title = "Cấu hình",          IconName = "Settings",    Path = "/backoffice/config",              AllowedRoles = ["Admin"],           DisplayOrder = 2, Description = "Cài đặt hệ thống" },
                    new() { Title = "Trạng thái",        IconName = "Activity",    Path = "/backoffice/system-health",       AllowedRoles = ["Admin"],           DisplayOrder = 3, Description = "Health & Monitor" },
                    new() { Title = "Thanh toán SePay",  IconName = "CreditCard",  Path = "/backoffice/payments/sepay",      AllowedRoles = ["Admin"],           DisplayOrder = 4, Description = "Cấu hình & Giao dịch" },
                    new() { Title = "Báo cáo",           IconName = "BarChart3",   Path = "/backoffice/reports",             AllowedRoles = ["Admin","Manager"], DisplayOrder = 5, Description = "Thống kê & báo cáo" },
                    new() { Title = "Nhật ký & Backup",  IconName = "Activity",    Path = "/backoffice/audit-logs",          AllowedRoles = ["Admin"],           DisplayOrder = 6, Description = "Log hoạt động & sao lưu" },
                    new() { Title = "Quản lý Menu",      IconName = "LayoutList",  Path = "/backoffice/admin/menu-editor",   AllowedRoles = ["Admin"],           DisplayOrder = 7, Description = "Chỉnh sửa menu backoffice" },
                }
            },
        };
    }
}
