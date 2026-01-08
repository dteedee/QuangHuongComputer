namespace Identity.Permissions;

public static class SystemPermissions
{
    public const string PermissionType = "Permission";

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
        public const string Edit = "Permissions.Roles.Edit"; // i.e. assign permissions
        public const string Delete = "Permissions.Roles.Delete";
    }

    public static class Catalog
    {
        public const string View = "Permissions.Catalog.View";
        public const string Create = "Permissions.Catalog.Create";
        public const string Edit = "Permissions.Catalog.Edit";
        public const string Delete = "Permissions.Catalog.Delete";
    }

    public static class Sales
    {
        public const string ViewOrders = "Permissions.Sales.ViewOrders";
        public const string ManageOrders = "Permissions.Sales.ManageOrders"; // Cancel, Edit
        public const string UpdateStatus = "Permissions.Sales.UpdateStatus";
    }

    public static class Repairs
    {
        public const string View = "Permissions.Repairs.View";
        public const string Create = "Permissions.Repairs.Create";
        public const string Edit = "Permissions.Repairs.Edit"; // Diagnose, Quote
        public const string Complete = "Permissions.Repairs.Complete";
    }

    public static class Inventory
    {
        public const string View = "Permissions.Inventory.View";
        public const string Adjust = "Permissions.Inventory.Adjust";
        public const string Stocktake = "Permissions.Inventory.Stocktake";
    }

    public static class Procurement
    {
        public const string ViewPO = "Permissions.Procurement.ViewPO";
        public const string CreatePO = "Permissions.Procurement.CreatePO";
        public const string ApprovePO = "Permissions.Procurement.ApprovePO";
    }

    public static class Accounting
    {
        public const string View = "Permissions.Accounting.View";
        public const string ManageInvoices = "Permissions.Accounting.ManageInvoices";
        public const string ApproveDebt = "Permissions.Accounting.ApproveDebt";
    }

    public static class Marketing
    {
        public const string Manage = "Permissions.Marketing.Manage";
    }

    public static class Reporting
    {
        public const string View = "Permissions.Reporting.View";
        public const string ViewFinancial = "Permissions.Reporting.ViewFinancial"; // Sensitive
    }

    public static class System
    {
        public const string Config = "Permissions.System.Config";
    }

    public static List<string> GetAllPermissions()
    {
        var permissions = new List<string>();
        var nestedClasses = typeof(SystemPermissions).GetNestedTypes();

        foreach (var nested in nestedClasses)
        {
            foreach (var field in nested.GetFields())
            {
                if (field.IsLiteral && !field.IsInitOnly)
                {
                    permissions.Add(field.GetValue(null)?.ToString() ?? "");
                }
            }
        }
        return permissions;
    }
}
