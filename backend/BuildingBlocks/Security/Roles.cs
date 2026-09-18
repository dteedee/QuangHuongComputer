namespace BuildingBlocks.Security;

/// <summary>
/// Tên role thật trong DB. Role CHỈ là một gói quyền (bundle) — không endpoint nào
/// được phép kiểm tra role trực tiếp nữa; dùng policy permission thay thế (W1-1).
/// Ngoại lệ duy nhất: <see cref="Admin"/> được
/// <see cref="PermissionAuthorizationHandler"/> bypass để không bao giờ tự khoá mình ra ngoài.
/// </summary>
public static class Roles
{
    public const string Admin = "Admin";
    public const string Manager = "Manager";
    public const string TechnicianInShop = "TechnicianInShop";
    public const string TechnicianOnSite = "TechnicianOnSite";
    public const string Accountant = "Accountant";
    public const string Sale = "Sale";
    public const string Customer = "Customer";
    public const string Marketing = "Marketing";
    public const string Supplier = "Supplier";
    public const string InventoryStaff = "InventoryStaff";
    public const string HR = "HR";

    /// <summary>Mọi role nhân viên nội bộ (không gồm Customer/Supplier).</summary>
    public static readonly string[] Staff =
    {
        Admin, Manager, Sale, InventoryStaff, Accountant, HR, Marketing,
        TechnicianInShop, TechnicianOnSite
    };

    /// <summary>Mọi role hệ thống seed sẵn.</summary>
    public static readonly string[] All =
    {
        Admin, Manager, Sale, InventoryStaff, Accountant, HR, Marketing,
        TechnicianInShop, TechnicianOnSite, Customer, Supplier
    };
}
