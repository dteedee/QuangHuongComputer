using P = BuildingBlocks.Security.Permissions;

namespace BuildingBlocks.Security;

/// <summary>
/// DỮ LIỆU của <see cref="RolePermissionMatrix"/>.
/// <c>v1</c> = tập quyền đã seed trước đợt tổng rà soát (mọi DB hiện có đã có sẵn).
/// <c>v2</c> = quyền W1-1 bổ sung; chỉ những mục này được cấp thêm cho DB đã ở v1,
/// nên các thao tác thu hồi tay của admin không bị ghi đè.
/// <c>v3</c> = bảng chuyển hướng URL (Content.ViewRedirects / ManageRedirects).
/// <c>v4</c> = danh mục dịch vụ sửa chữa (Repair.ManageServiceTypes).
/// Admin không có ở đây — Admin luôn nhận toàn bộ danh mục.
/// </summary>
internal static class RolePermissionMatrixData
{
    internal static Dictionary<string, List<RoleGrant>> Build()
    {
        var matrix = new Dictionary<string, List<RoleGrant>>(StringComparer.Ordinal);

        void Role(string role, string[] v1, string[] v2, string[]? v3 = null, string[]? v4 = null) =>
            matrix[role] = v1.Select(p => new RoleGrant(p, 1))
                .Concat(v2.Select(p => new RoleGrant(p, 2)))
                .Concat((v3 ?? Array.Empty<string>()).Select(p => new RoleGrant(p, 3)))
                .Concat((v4 ?? Array.Empty<string>()).Select(p => new RoleGrant(p, 4))).ToList();

        // Manager — Quản lý cửa hàng: làm được gần như mọi nghiệp vụ, trừ cấu hình hệ thống, tạo tài khoản và phân vai trò (đã bị W0-3 thu hồi).
        Role(Roles.Manager,
            v1: new[]
            {
                P.Catalog.View, P.Catalog.Create, P.Catalog.Edit, P.Catalog.Delete, P.Catalog.Manage,
                P.Sales.ViewAll, P.Sales.ManageAll, P.Sales.UpdateStatus, P.Sales.CancelOrder,
                P.Sales.ViewReturns, P.Sales.ManageReturns,
                P.Repair.ViewAll, P.Repair.UpdateStatus, P.Repair.AssignTechnician,
                P.Repair.CreateQuote, P.Repair.ApproveQuote, P.Repair.Complete,
                P.Inventory.ViewSupplier, P.Inventory.CreateSupplier, P.Inventory.UpdateSupplier,
                P.Inventory.DeleteSupplier, P.Inventory.ViewStock, P.Inventory.ManageStock,
                P.Inventory.AdjustStock, P.Inventory.ViewPurchaseOrder, P.Inventory.CreatePurchaseOrder,
                P.Inventory.ApprovePurchaseOrder, P.Inventory.ReceivePurchaseOrder, P.Inventory.ViewReservations,
                P.Accounting.ViewInvoices, P.Accounting.CreateInvoice, P.Accounting.EditInvoice,
                P.Accounting.ViewReports, P.Accounting.ManageDebt,
                P.Warranty.ViewAll, P.Warranty.ReviewClaim, P.Warranty.ApproveClaim,
                P.Content.ViewPages, P.Content.ManagePages, P.Content.ViewPosts, P.Content.ManagePosts,
                P.Content.ViewCoupons, P.Content.ManageCoupons, P.Content.ViewBanners,
                P.Content.ManageBanners, P.Content.ManageMedia,
                P.Users.View, P.Users.Edit,
                P.Reporting.ViewSales, P.Reporting.ViewInventory, P.Reporting.ViewFinancial,
                P.Reporting.ViewRepair, P.Reporting.ExportReports,
                P.HR.ViewEmployees, P.HR.ManageEmployees, P.HR.ViewAttendance, P.HR.ManageAttendance,
                P.HR.ViewPayroll, P.HR.ManagePayroll,
                P.System.ViewConfig,
            },
            v2: new[]
            {
                P.Catalog.Export, P.Catalog.Import, P.Catalog.BulkPrice,
                P.Sales.Pos, P.Sales.Export, P.Sales.SellOnCredit, P.Sales.TakeDeposit,
                P.Sales.ManageInstallments,
                P.Sales.Quotations.View, P.Sales.Quotations.Create, P.Sales.Quotations.Edit,
                P.Sales.Quotations.Approve,
                P.Inventory.Approve, P.Inventory.ImportOpening, P.Inventory.QuickReceive, P.Inventory.Export,
                P.Payments.View, P.Payments.Reconcile, P.Payments.CollectCod, P.Payments.Refund,
                P.Accounting.ManageInvoices, P.Accounting.ManageExpense, P.Accounting.Export,
                P.Warranty.Moderate,
                P.Content.ManageMenus, P.Content.ManageContacts,
                P.CRM.ViewCustomers, P.CRM.ManageCustomers, P.CRM.ViewLeads, P.CRM.ManageLeads,
                P.CRM.ViewSegments, P.CRM.ManageSegments, P.CRM.ViewAnalytics, P.CRM.ManageTasks,
                P.CRM.ViewCampaigns, P.CRM.ManageCampaigns, P.CRM.SendCampaigns,
                P.HR.ApproveLeave,
                P.Reporting.ViewHR,
            },
            v3: new[] { P.Content.ViewRedirects, P.Content.ManageRedirects },
            v4: new[] { P.Repair.ManageServiceTypes });
        // Sale — Bán hàng: POS + đơn hàng + khách hàng tiềm năng (tiêu chí W1-1). KHÔNG có huỷ đơn, không bán công nợ, không duyệt đổi/trả.
        Role(Roles.Sale,
            v1: new[]
            {
                P.Catalog.View,
                P.Sales.ViewAll, P.Sales.Checkout, P.Sales.UpdateStatus, P.Sales.ViewReturns,
                P.Inventory.ViewStock,
                P.Repair.Book, P.Repair.ViewAll,
                P.Warranty.SubmitClaim, P.Warranty.ViewAll,
                P.Content.ViewPages, P.Content.ViewPosts, P.Content.ViewCoupons,
                P.Reporting.ViewSales,
            },
            v2: new[]
            {
                P.Sales.ManageAll, P.Sales.Pos, P.Sales.TakeDeposit, P.Sales.Export,
                P.Sales.Quotations.View, P.Sales.Quotations.Create, P.Sales.Quotations.Edit,
                P.Payments.View, P.Payments.CollectCod,
                P.CRM.ViewCustomers, P.CRM.ManageCustomers, P.CRM.ViewLeads, P.CRM.ManageLeads,
                P.CRM.ViewSegments, P.CRM.ManageTasks,
            });
        // InventoryStaff — Kho vận: nhập/xuất/kiểm kê, lập đề nghị mua — KHÔNG duyệt, không chạm tài chính.
        Role(Roles.InventoryStaff,
            v1: new[]
            {
                P.Catalog.View,
                P.Inventory.ViewStock, P.Inventory.ManageStock, P.Inventory.AdjustStock,
                P.Inventory.ViewPurchaseOrder, P.Inventory.ReceivePurchaseOrder,
                P.Inventory.ViewReservations, P.Inventory.ViewSupplier,
                P.Reporting.ViewInventory,
            },
            v2: new[]
            {
                P.Inventory.CreatePurchaseOrder, P.Inventory.QuickReceive,
                P.Inventory.ImportOpening, P.Inventory.Export,
            });
        // Accountant — Kế toán: hoá đơn, công nợ, thanh toán, báo cáo tài chính; theo D06 được sửa tham số lương/thuế/bảo hiểm (HR chỉ đọc).
        Role(Roles.Accountant,
            v1: new[]
            {
                P.Sales.ViewAll,
                P.Accounting.ViewInvoices, P.Accounting.CreateInvoice, P.Accounting.EditInvoice,
                P.Accounting.DeleteInvoice, P.Accounting.ApproveCredit, P.Accounting.ViewReports,
                P.Accounting.ManageDebt,
                P.Inventory.ViewStock, P.Inventory.ViewPurchaseOrder, P.Inventory.ViewSupplier,
                P.Reporting.ViewSales, P.Reporting.ViewInventory, P.Reporting.ViewFinancial,
                P.Reporting.ExportReports,
                P.HR.ViewEmployees, P.HR.ViewPayroll, P.HR.ManagePayroll,
            },
            v2: new[]
            {
                P.Accounting.ManageInvoices, P.Accounting.ManageExpense, P.Accounting.Export,
                P.Payments.View, P.Payments.Reconcile, P.Payments.Refund, P.Payments.CollectCod,
                // KHÔNG có P.Sales.SellOnCredit: phần "Decision updates" của phase-10 (D01-D12,
                // ràng buộc) ghi rõ SellOnCredit mặc định CHỈ Admin và Manager. Kế toán duyệt
                // hạn mức công nợ bằng P.Accounting.ApproveCredit, không tự bán công nợ.
                P.HR.ManageStatutoryParameters,
                P.Reporting.ViewHR,
            });
        // HR — Nhân sự: trọn module HR, không chạm Kế toán/Bán hàng. D06: chỉ ĐỌC tham số luật.
        Role(Roles.HR,
            v1: new[]
            {
                P.HR.ViewEmployees, P.HR.ManageEmployees, P.HR.ViewAttendance,
                P.HR.ManageAttendance, P.HR.ViewPayroll, P.HR.ManagePayroll,
            },
            v2: new[]
            {
                P.HR.ApproveLeave,
                P.Reporting.ViewHR,
            });
        // Marketing — Nội dung + chiến dịch CRM. Sales.ViewAll giữ lại để widget thống kê ở topbar back-office không 403 (integration request W0 #56).
        Role(Roles.Marketing,
            v1: new[]
            {
                P.Catalog.View,
                P.Content.ViewPages, P.Content.ManagePages, P.Content.ViewPosts, P.Content.ManagePosts,
                P.Content.ViewCoupons, P.Content.ManageCoupons, P.Content.ViewBanners,
                P.Content.ManageBanners, P.Content.ManageMedia,
                P.Sales.ViewAll,
                P.Reporting.ViewSales,
            },
            v2: new[]
            {
                P.Content.ManageMenus, P.Content.ManageContacts,
                P.CRM.ViewCustomers, P.CRM.ViewLeads, P.CRM.ViewSegments, P.CRM.ManageSegments,
                P.CRM.ViewAnalytics, P.CRM.ViewCampaigns, P.CRM.ManageCampaigns, P.CRM.SendCampaigns,
            },
            v3: new[] { P.Content.ViewRedirects, P.Content.ManageRedirects });
        // Kỹ thuật viên tại cửa hàng
        Role(Roles.TechnicianInShop,
            v1: new[]
            {
                P.Catalog.View,
                P.Repair.ViewOwn, P.Repair.ViewAll, P.Repair.UpdateStatus,
                P.Repair.CreateQuote, P.Repair.Complete,
                P.Inventory.ViewStock, P.Inventory.ViewReservations,
                P.Warranty.ViewAll, P.Warranty.ReviewClaim,
                P.Reporting.ViewRepair,
            },
            v2: Array.Empty<string>());
        // Kỹ thuật viên tại nhà khách
        Role(Roles.TechnicianOnSite,
            v1: new[]
            {
                P.Catalog.View,
                P.Repair.ViewOwn, P.Repair.UpdateStatus, P.Repair.CreateQuote, P.Repair.Complete,
                P.Inventory.ViewStock,
                P.Warranty.ViewOwn, P.Warranty.ReviewClaim,
            },
            // ViewAll cần cho UpdateStatus/CreateQuote/Complete; Warranty.ViewAll cần cho
            // ReviewClaim — v1 thiếu cả hai nên các quyền kia là quyền chết.
            v2: new[] { P.Repair.ViewAll, P.Warranty.ViewAll });
        // Khách hàng — TUYỆT ĐỐI không có quyền nhân viên nào (có unit test canh giữ).
        Role(Roles.Customer,
            v1: new[]
            {
                P.Catalog.View,
                P.Sales.ViewOwn, P.Sales.Checkout,
                P.Repair.Book, P.Repair.ViewOwn,
                P.Warranty.SubmitClaim, P.Warranty.ViewOwn,
                P.Content.ViewPages, P.Content.ViewPosts,
            },
            v2: Array.Empty<string>());
        // Nhà cung cấp
        Role(Roles.Supplier,
            v1: new[] { P.Inventory.ViewPurchaseOrder, P.Catalog.View },
            v2: Array.Empty<string>());

        return matrix;
    }
}
