namespace BuildingBlocks.Security;

/// <summary>Nhóm quyền thương mại: Catalog, Sales, Inventory, Payments.</summary>
public static partial class Permissions
{
    public static class Catalog
    {
        public const string View = "Permissions.Catalog.View";
        public const string Create = "Permissions.Catalog.Create";
        public const string Edit = "Permissions.Catalog.Edit";
        public const string Delete = "Permissions.Catalog.Delete";
        public const string Manage = "Permissions.Catalog.Manage";
        public const string Export = "Permissions.Catalog.Export";
        /// <summary>D10: nhập sản phẩm hàng loạt từ file.</summary>
        public const string Import = "Permissions.Catalog.Import";
        /// <summary>D10: đổi giá hàng loạt (rất nhạy cảm — chỉ Admin/Manager).</summary>
        public const string BulkPrice = "Permissions.Catalog.BulkPrice";
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
        /// <summary>Bán hàng tại quầy (POS).</summary>
        public const string Pos = "Permissions.Sales.Pos";
        public const string Export = "Permissions.Sales.Export";
        /// <summary>D10: bán công nợ — mặc định chỉ Admin + Manager.</summary>
        public const string SellOnCredit = "Permissions.Sales.SellOnCredit";
        /// <summary>D10: nhận đặt cọc.</summary>
        public const string TakeDeposit = "Permissions.Sales.TakeDeposit";
        /// <summary>D10: quản lý trả góp.</summary>
        public const string ManageInstallments = "Permissions.Sales.ManageInstallments";

        /// <summary>D10: báo giá (nhóm con, vẫn theo quy ước Module.Action).</summary>
        public static class Quotations
        {
            public const string View = "Permissions.Sales.Quotations.View";
            public const string Create = "Permissions.Sales.Quotations.Create";
            public const string Edit = "Permissions.Sales.Quotations.Edit";
            public const string Approve = "Permissions.Sales.Quotations.Approve";
        }
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
        public const string Export = "Permissions.Inventory.Export";
        /// <summary>
        /// Duyệt nghiệp vụ kho nói chung. Theo D09 quyền này BAO GỒM chuyển kho một bước
        /// (<c>POST /api/inventory/transfers/{id}/complete</c>). Duyệt đơn mua vẫn dùng
        /// <see cref="ApprovePurchaseOrder"/>.
        /// </summary>
        public const string Approve = "Permissions.Inventory.Approve";
        /// <summary>D10: nhập tồn đầu kỳ.</summary>
        public const string ImportOpening = "Permissions.Inventory.ImportOpening";
        /// <summary>D10: nhập nhanh không cần PO.</summary>
        public const string QuickReceive = "Permissions.Inventory.QuickReceive";
    }

    /// <summary>D04 — cổng thanh toán (SePay/VietQR, COD, chuyển khoản).</summary>
    public static class Payments
    {
        public const string View = "Permissions.Payments.View";
        /// <summary>Đối soát giao dịch với sao kê ngân hàng.</summary>
        public const string Reconcile = "Permissions.Payments.Reconcile";
        public const string Refund = "Permissions.Payments.Refund";
        /// <summary>Xác nhận thu tiền COD.</summary>
        public const string CollectCod = "Permissions.Payments.CollectCod";
        /// <summary>Cấu hình nhà cung cấp thanh toán, khoá API.</summary>
        public const string Configure = "Permissions.Payments.Configure";
    }
}
