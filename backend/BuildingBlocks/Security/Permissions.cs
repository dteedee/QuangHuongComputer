namespace BuildingBlocks.Security;

public static class Permissions
{
    public const string PermissionType = "Permission";

    public static class Catalog
    {
        public const string View = "Permissions.Catalog.View";
        public const string Create = "Permissions.Catalog.Create";
        public const string Edit = "Permissions.Catalog.Edit";
        public const string Delete = "Permissions.Catalog.Delete";
        public const string Manage = "Permissions.Catalog.Manage";
    }

    public static class Sales
    {
        public const string ViewOwn = "Permissions.Sales.ViewOwn";
        public const string ViewAll = "Permissions.Sales.ViewAll";
        public const string ManageAll = "Permissions.Sales.ManageAll";
        public const string Checkout = "Permissions.Sales.Checkout";
        public const string UpdateStatus = "Permissions.Sales.UpdateStatus";
        public const string CancelOrder = "Permissions.Sales.CancelOrder";
        public const string ViewReturns = "Permissions.Sales.ViewReturns";
        public const string ManageReturns = "Permissions.Sales.ManageReturns";
    }

    public static class Repair
    {
        public const string Book = "Permissions.Repair.Book";
        public const string ViewOwn = "Permissions.Repair.ViewOwn";
        public const string ViewAll = "Permissions.Repair.ViewAll";
        public const string UpdateStatus = "Permissions.Repair.UpdateStatus";
        public const string AssignTechnician = "Permissions.Repair.AssignTechnician";
        public const string CreateQuote = "Permissions.Repair.CreateQuote";
        public const string ApproveQuote = "Permissions.Repair.ApproveQuote";
        public const string Complete = "Permissions.Repair.Complete";
    }

    public static class Accounting
    {
        public const string ViewInvoices = "Permissions.Accounting.ViewInvoices";
        public const string CreateInvoice = "Permissions.Accounting.CreateInvoice";
        public const string EditInvoice = "Permissions.Accounting.EditInvoice";
        public const string DeleteInvoice = "Permissions.Accounting.DeleteInvoice";
        public const string ApproveCredit = "Permissions.Accounting.ApproveCredit";
        public const string ViewReports = "Permissions.Accounting.ViewReports";
        public const string ManageDebt = "Permissions.Accounting.ManageDebt";
    }

    public static class Warranty
    {
        public const string SubmitClaim = "Permissions.Warranty.SubmitClaim";
        public const string ViewOwn = "Permissions.Warranty.ViewOwn";
        public const string ViewAll = "Permissions.Warranty.ViewAll";
        public const string ReviewClaim = "Permissions.Warranty.ReviewClaim";
        public const string ApproveClaim = "Permissions.Warranty.ApproveClaim";
    }

    public static class Inventory
    {
        public const string ViewSupplier = "Permissions.Inventory.ViewSupplier";
        public const string CreateSupplier = "Permissions.Inventory.CreateSupplier";
        public const string UpdateSupplier = "Permissions.Inventory.UpdateSupplier";
        public const string DeleteSupplier = "Permissions.Inventory.DeleteSupplier";
        public const string ViewStock = "Permissions.Inventory.ViewStock";
        public const string ManageStock = "Permissions.Inventory.ManageStock";
        public const string AdjustStock = "Permissions.Inventory.AdjustStock";
        public const string ViewPurchaseOrder = "Permissions.Inventory.ViewPurchaseOrder";
        public const string CreatePurchaseOrder = "Permissions.Inventory.CreatePurchaseOrder";
        public const string ApprovePurchaseOrder = "Permissions.Inventory.ApprovePurchaseOrder";
        public const string ReceivePurchaseOrder = "Permissions.Inventory.ReceivePurchaseOrder";
        public const string ViewReservations = "Permissions.Inventory.ViewReservations";
    }

    public static class Content
    {
        public const string ViewPages = "Permissions.Content.ViewPages";
        public const string ManagePages = "Permissions.Content.ManagePages";
        public const string ViewPosts = "Permissions.Content.ViewPosts";
        public const string ManagePosts = "Permissions.Content.ManagePosts";
        public const string ViewCoupons = "Permissions.Content.ViewCoupons";
        public const string ManageCoupons = "Permissions.Content.ManageCoupons";
        public const string ViewBanners = "Permissions.Content.ViewBanners";
        public const string ManageBanners = "Permissions.Content.ManageBanners";
        public const string ManageMedia = "Permissions.Content.ManageMedia";
    }

    public static class Users
    {
        public const string View = "Permissions.Users.View";
        public const string Create = "Permissions.Users.Create";
        public const string Edit = "Permissions.Users.Edit";
        public const string Delete = "Permissions.Users.Delete";
        public const string ManageRoles = "Permissions.Users.ManageRoles";
    }

    public static class Roles
    {
        public const string View = "Permissions.Roles.View";
        public const string Create = "Permissions.Roles.Create";
        public const string Edit = "Permissions.Roles.Edit";
        public const string Delete = "Permissions.Roles.Delete";
    }

    public static class Reporting
    {
        public const string ViewSales = "Permissions.Reporting.ViewSales";
        public const string ViewInventory = "Permissions.Reporting.ViewInventory";
        public const string ViewFinancial = "Permissions.Reporting.ViewFinancial";
        public const string ViewRepair = "Permissions.Reporting.ViewRepair";
        public const string ExportReports = "Permissions.Reporting.ExportReports";
    }

    public static class System
    {
        public const string ViewConfig = "Permissions.System.ViewConfig";
        public const string ManageConfig = "Permissions.System.ManageConfig";
        public const string ViewLogs = "Permissions.System.ViewLogs";
    }

    public static class HR
    {
        public const string ViewEmployees = "Permissions.HR.ViewEmployees";
        public const string ManageEmployees = "Permissions.HR.ManageEmployees";
        public const string ViewAttendance = "Permissions.HR.ViewAttendance";
        public const string ManageAttendance = "Permissions.HR.ManageAttendance";
        public const string ViewPayroll = "Permissions.HR.ViewPayroll";
        public const string ManagePayroll = "Permissions.HR.ManagePayroll";
    }

    public static class CRM
    {
        public const string ViewCustomers = "Permissions.CRM.ViewCustomers";
        public const string ManageCustomers = "Permissions.CRM.ManageCustomers";
        public const string ViewLeads = "Permissions.CRM.ViewLeads";
        public const string ManageLeads = "Permissions.CRM.ManageLeads";
        public const string ViewSegments = "Permissions.CRM.ViewSegments";
        public const string ManageSegments = "Permissions.CRM.ManageSegments";
        public const string ViewAnalytics = "Permissions.CRM.ViewAnalytics";
        public const string ManageTasks = "Permissions.CRM.ManageTasks";
        public const string ViewCampaigns = "Permissions.CRM.ViewCampaigns";
        public const string ManageCampaigns = "Permissions.CRM.ManageCampaigns";
        public const string SendCampaigns = "Permissions.CRM.SendCampaigns";
    }

    public static List<string> GetAllPermissions()
    {
        var permissions = new List<string>();
        var nestedClasses = typeof(Permissions).GetNestedTypes();

        foreach (var nested in nestedClasses)
        {
            foreach (var field in nested.GetFields())
            {
                if (field.IsLiteral && !field.IsInitOnly && field.FieldType == typeof(string))
                {
                    var value = field.GetValue(null)?.ToString();
                    if (!string.IsNullOrEmpty(value) && value.StartsWith("Permissions."))
                    {
                        permissions.Add(value);
                    }
                }
            }
        }
        return permissions;
    }
}

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
}
