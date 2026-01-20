namespace BuildingBlocks.Security;

public static class Permissions
{
    public static class Catalog
    {
        public const string View = "Permissions.Catalog.View";
        public const string Manage = "Permissions.Catalog.Manage";
    }

    public static class Sales
    {
        public const string ViewOwn = "Permissions.Sales.ViewOwn";
        public const string ManageAll = "Permissions.Sales.ManageAll";
        public const string Checkout = "Permissions.Sales.Checkout";
    }

    public static class Repair
    {
        public const string Book = "Permissions.Repair.Book";
        public const string UpdateStatus = "Permissions.Repair.UpdateStatus";
        public const string ViewAll = "Permissions.Repair.ViewAll";
    }

    public static class Accounting
    {
        public const string ViewInvoices = "Permissions.Accounting.ViewInvoices";
        public const string CreateInvoice = "Permissions.Accounting.CreateInvoice";
        public const string ApproveCredit = "Permissions.Accounting.ApproveCredit";
    }

    public static class Warranty
    {
        public const string SubmitClaim = "Permissions.Warranty.SubmitClaim";
        public const string ReviewClaim = "Permissions.Warranty.ReviewClaim";
    }

    public static class Inventory
    {
        public const string ViewSupplier = "Permissions.Inventory.ViewSupplier";
        public const string CreateSupplier = "Permissions.Inventory.CreateSupplier";
        public const string UpdateSupplier = "Permissions.Inventory.UpdateSupplier";
        public const string DeleteSupplier = "Permissions.Inventory.DeleteSupplier";
        public const string ViewStock = "Permissions.Inventory.ViewStock";
        public const string ManageStock = "Permissions.Inventory.ManageStock";
        public const string ViewPurchaseOrder = "Permissions.Inventory.ViewPurchaseOrder";
        public const string CreatePurchaseOrder = "Permissions.Inventory.CreatePurchaseOrder";
        public const string ReceivePurchaseOrder = "Permissions.Inventory.ReceivePurchaseOrder";
    }
}

public static class Roles
{
    public const string Admin = "Admin";
    public const string Manager = "Manager";
    public const string Technician = "Technician";
    public const string Accountant = "Accountant";
    public const string Sale = "Sale";
    public const string Customer = "Customer";
}
