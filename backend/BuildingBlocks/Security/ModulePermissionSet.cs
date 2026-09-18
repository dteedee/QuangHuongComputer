namespace BuildingBlocks.Security;

/// <summary>
/// Ánh xạ động từ HTTP verb sang permission của một module:
/// GET/HEAD -> <see cref="View"/>, POST -> <see cref="Create"/>,
/// PUT/PATCH -> <see cref="Edit"/>, DELETE -> <see cref="Delete"/>.
///
/// Dùng cho <c>group.RequireModulePermissions(PermissionModules.X)</c> (W1-10).
/// Hành động đặc biệt (Approve, Export, Pos, CancelOrder, Refund...) KHÔNG đi qua đây —
/// endpoint đó phải khai báo <c>.RequireAuthorization(Permissions.X.Y)</c> tường minh.
/// </summary>
public sealed record ModulePermissionSet(
    string Module,
    string View,
    string Create,
    string Edit,
    string Delete)
{
    /// <summary>Module theo đúng quy ước Module.Action, ví dụ "Permissions.Users".</summary>
    public static ModulePermissionSet FromPrefix(string module, string prefix) =>
        new(module, $"{prefix}.View", $"{prefix}.Create", $"{prefix}.Edit", $"{prefix}.Delete");

    /// <summary>Permission tương ứng một HTTP verb. Verb lạ -> quyền Edit (fail-closed).</summary>
    public string ForMethod(string httpMethod) => httpMethod.ToUpperInvariant() switch
    {
        "GET" or "HEAD" or "OPTIONS" => View,
        "POST" => Create,
        "PUT" or "PATCH" => Edit,
        "DELETE" => Delete,
        _ => Edit
    };

    /// <summary>
    /// Với endpoint khai báo nhiều verb, chọn quyền CHẶT NHẤT trong số đó
    /// (Delete > Edit > Create > View) để không vô tình nới lỏng.
    /// </summary>
    public string ForMethods(IEnumerable<string> httpMethods)
    {
        var permissions = httpMethods.Select(ForMethod).ToHashSet(StringComparer.Ordinal);
        if (permissions.Count == 0) return Edit;
        foreach (var candidate in new[] { Delete, Edit, Create, View })
        {
            if (permissions.Contains(candidate)) return candidate;
        }
        return permissions.First();
    }

    /// <summary>Tất cả permission mà set này có thể sinh ra (dùng cho test tính đầy đủ).</summary>
    public IEnumerable<string> All() => new[] { View, Create, Edit, Delete }.Distinct(StringComparer.Ordinal);
}

/// <summary>
/// Bộ quyền chuẩn theo module để W1-10 quét endpoint. Module nào đã có sẵn hằng số
/// chuyên biệt thì ánh xạ vào hằng số đó (không đẻ thêm quyền mới, tránh phải
/// seed lại claim trong DB).
/// </summary>
public static class PermissionModules
{
    public static readonly ModulePermissionSet Catalog =
        ModulePermissionSet.FromPrefix("Catalog", "Permissions.Catalog");

    public static readonly ModulePermissionSet Users =
        ModulePermissionSet.FromPrefix("Users", "Permissions.Users");

    public static readonly ModulePermissionSet Roles =
        ModulePermissionSet.FromPrefix("Roles", "Permissions.Roles");

    public static readonly ModulePermissionSet Payments = new(
        "Payments",
        Permissions.Payments.View, Permissions.Payments.View,
        Permissions.Payments.Reconcile, Permissions.Payments.Refund);

    public static readonly ModulePermissionSet Quotations =
        ModulePermissionSet.FromPrefix("Sales", "Permissions.Sales.Quotations") with
        { Delete = Permissions.Sales.Quotations.Edit };

    public static readonly ModulePermissionSet Sales = new(
        "Sales",
        Permissions.Sales.ViewAll, Permissions.Sales.ManageAll,
        Permissions.Sales.UpdateStatus, Permissions.Sales.CancelOrder);

    public static readonly ModulePermissionSet Inventory = new(
        "Inventory",
        Permissions.Inventory.ViewStock, Permissions.Inventory.ManageStock,
        Permissions.Inventory.AdjustStock, Permissions.Inventory.AdjustStock);

    public static readonly ModulePermissionSet Suppliers = new(
        "Inventory",
        Permissions.Inventory.ViewSupplier, Permissions.Inventory.CreateSupplier,
        Permissions.Inventory.UpdateSupplier, Permissions.Inventory.DeleteSupplier);

    public static readonly ModulePermissionSet PurchaseOrders = new(
        "Inventory",
        Permissions.Inventory.ViewPurchaseOrder, Permissions.Inventory.CreatePurchaseOrder,
        Permissions.Inventory.CreatePurchaseOrder, Permissions.Inventory.ApprovePurchaseOrder);

    public static readonly ModulePermissionSet Repair = new(
        "Repair",
        Permissions.Repair.ViewAll, Permissions.Repair.CreateQuote,
        Permissions.Repair.UpdateStatus, Permissions.Repair.UpdateStatus);

    public static readonly ModulePermissionSet Warranty = new(
        "Warranty",
        Permissions.Warranty.ViewAll, Permissions.Warranty.ReviewClaim,
        Permissions.Warranty.ReviewClaim, Permissions.Warranty.ApproveClaim);

    public static readonly ModulePermissionSet Accounting = new(
        "Accounting",
        Permissions.Accounting.ViewInvoices, Permissions.Accounting.CreateInvoice,
        Permissions.Accounting.EditInvoice, Permissions.Accounting.DeleteInvoice);

    public static readonly ModulePermissionSet HR = new(
        "HR",
        Permissions.HR.ViewEmployees, Permissions.HR.ManageEmployees,
        Permissions.HR.ManageEmployees, Permissions.HR.ManageEmployees);

    public static readonly ModulePermissionSet Attendance = new(
        "HR",
        Permissions.HR.ViewAttendance, Permissions.HR.ManageAttendance,
        Permissions.HR.ManageAttendance, Permissions.HR.ManageAttendance);

    public static readonly ModulePermissionSet Payroll = new(
        "HR",
        Permissions.HR.ViewPayroll, Permissions.HR.ManagePayroll,
        Permissions.HR.ManagePayroll, Permissions.HR.ManagePayroll);

    public static readonly ModulePermissionSet Crm = new(
        "CRM",
        Permissions.CRM.ViewCustomers, Permissions.CRM.ManageCustomers,
        Permissions.CRM.ManageCustomers, Permissions.CRM.ManageCustomers);

    public static readonly ModulePermissionSet Leads = new(
        "CRM",
        Permissions.CRM.ViewLeads, Permissions.CRM.ManageLeads,
        Permissions.CRM.ManageLeads, Permissions.CRM.ManageLeads);

    public static readonly ModulePermissionSet Campaigns = new(
        "CRM",
        Permissions.CRM.ViewCampaigns, Permissions.CRM.ManageCampaigns,
        Permissions.CRM.ManageCampaigns, Permissions.CRM.ManageCampaigns);

    public static readonly ModulePermissionSet Content = new(
        "Content",
        Permissions.Content.ViewPages, Permissions.Content.ManagePages,
        Permissions.Content.ManagePages, Permissions.Content.ManagePages);

    public static readonly ModulePermissionSet Posts = new(
        "Content",
        Permissions.Content.ViewPosts, Permissions.Content.ManagePosts,
        Permissions.Content.ManagePosts, Permissions.Content.ManagePosts);

    public static readonly ModulePermissionSet Coupons = new(
        "Content",
        Permissions.Content.ViewCoupons, Permissions.Content.ManageCoupons,
        Permissions.Content.ManageCoupons, Permissions.Content.ManageCoupons);

    public static readonly ModulePermissionSet Banners = new(
        "Content",
        Permissions.Content.ViewBanners, Permissions.Content.ManageBanners,
        Permissions.Content.ManageBanners, Permissions.Content.ManageBanners);

    public static readonly ModulePermissionSet SystemConfig = new(
        "System",
        Permissions.System.ViewConfig, Permissions.System.ManageConfig,
        Permissions.System.ManageConfig, Permissions.System.ManageConfig);

    public static readonly ModulePermissionSet Reporting = new(
        "Reporting",
        Permissions.Reporting.ViewSales, Permissions.Reporting.ExportReports,
        Permissions.Reporting.ExportReports, Permissions.Reporting.ExportReports);

    /// <summary>Tất cả set đã khai báo — dùng cho test tính hợp lệ.</summary>
    public static IReadOnlyList<ModulePermissionSet> All() => new[]
    {
        Catalog, Users, Roles, Payments, Quotations, Sales, Inventory, Suppliers, PurchaseOrders,
        Repair, Warranty, Accounting, HR, Attendance, Payroll, Crm, Leads, Campaigns,
        Content, Posts, Coupons, Banners, SystemConfig, Reporting
    };
}
