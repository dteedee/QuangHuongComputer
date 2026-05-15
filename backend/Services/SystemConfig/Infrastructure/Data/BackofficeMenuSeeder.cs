using SystemConfig.Domain;
using SystemConfig.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace SystemConfig.Infrastructure.Data;

public static class BackofficeMenuSeeder
{
    public static async Task SeedAsync(SystemConfigDbContext context)
    {
        if (await context.BackofficeMenuGroups.AnyAsync()) return;

        var groups = new List<BackofficeMenuGroup>
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
                    new() { Title = "Dashboard",        IconName = "LayoutDashboard", Path = "/backoffice",                                AllowedRoles = ["Admin","Manager","Sale"],                               DisplayOrder = 0, Description = "Tổng quan hệ thống" },
                    new() { Title = "Bán hàng (POS)",   IconName = "Store",           Path = "/backoffice/pos",                            AllowedRoles = ["Admin","Manager","Sale"],                               DisplayOrder = 1, Description = "Quầy thu ngân" },
                    new() { Title = "Đơn hàng",         IconName = "Receipt",         Path = "/backoffice/orders",                         AllowedRoles = ["Admin","Manager","Sale"],                               DisplayOrder = 2, Description = "Quản lý đơn hàng", BadgeSource = "pendingOrders" },
                    new() { Title = "Sản phẩm",         IconName = "Package",         Path = "/backoffice/products",                       AllowedRoles = ["Admin","Manager"],                                     DisplayOrder = 3, Description = "Danh sách sản phẩm" },
                    new() { Title = "Danh mục",         IconName = "Archive",         Path = "/backoffice/categories",                     AllowedRoles = ["Admin","Manager"],                                     DisplayOrder = 4, Description = "Phân loại sản phẩm" },
                    new() { Title = "Thương hiệu",      IconName = "Tag",             Path = "/backoffice/brands",                         AllowedRoles = ["Admin","Manager"],                                     DisplayOrder = 5, Description = "Hãng sản xuất" },
                    new() { Title = "Kho hàng",         IconName = "Box",             Path = "/backoffice/inventory",                      AllowedRoles = ["Admin","Manager","Supplier"],                          DisplayOrder = 6, Description = "Quản lý tồn kho" },
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
                    new() { Title = "Quản lý Nội dung", IconName = "FileText",  Path = "/backoffice/cms",                 AllowedRoles = ["Admin","Manager","Sale"],  DisplayOrder = 0, Description = "Bài viết & trang" },
                    new() { Title = "Homepage Builder",  IconName = "Sparkles",  Path = "/backoffice/homepage-builder",    AllowedRoles = ["Admin","Manager"],         DisplayOrder = 1, Description = "Xây dựng trang chủ" },
                    new() { Title = "Menu Manager",      IconName = "Menu",      Path = "/backoffice/menus",               AllowedRoles = ["Admin","Manager"],         DisplayOrder = 2, Description = "Quản lý menu" },
                    new() { Title = "Flash Sales",       IconName = "Zap",       Path = "/backoffice/flash-sales",         AllowedRoles = ["Admin","Manager"],         DisplayOrder = 3, Description = "Giảm giá chớp nhoáng" },
                    new() { Title = "Mã giảm giá",       IconName = "Ticket",    Path = "/backoffice/coupons",             AllowedRoles = ["Admin","Manager"],         DisplayOrder = 4, Description = "Voucher & coupon" },
                    new() { Title = "Đánh giá",          IconName = "Star",      Path = "/backoffice/reviews",             AllowedRoles = ["Admin","Manager"],         DisplayOrder = 5, Description = "Review sản phẩm" },
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

        await context.BackofficeMenuGroups.AddRangeAsync(groups);
        await context.SaveChangesAsync();
    }
}
