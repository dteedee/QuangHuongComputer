namespace BuildingBlocks.Security;

/// <summary>
/// Bảng mô tả tiếng Việt cho từng permission. Đây là DỮ LIỆU của
/// <see cref="PermissionRegistry"/> — tách file để giữ phần logic ngắn.
/// Mỗi key ở đây phải tồn tại trong <see cref="Permissions"/> và ngược lại.
/// </summary>
internal static class PermissionRegistryDefinitions
{
    internal static List<PermissionDefinition> Build()
    {
        var all = new List<PermissionDefinition>();

        void Module(string module, string moduleDisplay, params PermissionDefinition[] defs)
        {
            foreach (var def in defs)
            {
                def.Module = module;
                def.ModuleDisplayName = moduleDisplay;
                def.Description = $"{moduleDisplay} — {def.DisplayName}";
                all.Add(def);
            }
        }

        static PermissionDefinition P(string key, string displayName, PermissionType type, string? dependsOn = null)
            => new() { Key = key, DisplayName = displayName, Type = type, DependsOn = dependsOn };

        Module("Catalog", "Sản phẩm",
            P(Permissions.Catalog.View, "Xem danh sách sản phẩm", PermissionType.View),
            P(Permissions.Catalog.Create, "Thêm sản phẩm mới", PermissionType.Create, Permissions.Catalog.View),
            P(Permissions.Catalog.Edit, "Chỉnh sửa sản phẩm", PermissionType.Edit, Permissions.Catalog.View),
            P(Permissions.Catalog.Delete, "Xoá sản phẩm", PermissionType.Delete, Permissions.Catalog.View),
            P(Permissions.Catalog.Manage, "Quản lý danh mục, thương hiệu, thuộc tính", PermissionType.Manage, Permissions.Catalog.View),
            P(Permissions.Catalog.Export, "Xuất file danh sách sản phẩm", PermissionType.Export, Permissions.Catalog.View),
            P(Permissions.Catalog.Import, "Nhập sản phẩm hàng loạt từ file", PermissionType.Create, Permissions.Catalog.Create),
            P(Permissions.Catalog.BulkPrice, "Đổi giá hàng loạt", PermissionType.Edit, Permissions.Catalog.Edit));

        Module("Sales", "Bán hàng",
            P(Permissions.Sales.ViewOwn, "Xem đơn hàng của chính mình", PermissionType.View),
            P(Permissions.Sales.ViewAll, "Xem tất cả đơn hàng", PermissionType.View),
            P(Permissions.Sales.ManageAll, "Sửa mọi đơn hàng", PermissionType.Manage, Permissions.Sales.ViewAll),
            P(Permissions.Sales.Checkout, "Đặt hàng / thanh toán", PermissionType.Create),
            P(Permissions.Sales.UpdateStatus, "Cập nhật trạng thái đơn", PermissionType.Edit, Permissions.Sales.ViewAll),
            P(Permissions.Sales.CancelOrder, "Huỷ đơn hàng", PermissionType.Delete, Permissions.Sales.ViewAll),
            P(Permissions.Sales.ViewReturns, "Xem yêu cầu đổi/trả", PermissionType.View),
            P(Permissions.Sales.ManageReturns, "Xử lý đổi/trả hàng", PermissionType.Manage, Permissions.Sales.ViewReturns),
            P(Permissions.Sales.Pos, "Bán hàng tại quầy (POS)", PermissionType.Create, Permissions.Sales.ViewAll),
            P(Permissions.Sales.Export, "Xuất báo cáo bán hàng", PermissionType.Export, Permissions.Sales.ViewAll),
            P(Permissions.Sales.SellOnCredit, "Bán công nợ (ghi nợ khách)", PermissionType.Approve, Permissions.Sales.ViewAll),
            P(Permissions.Sales.TakeDeposit, "Nhận đặt cọc", PermissionType.Create, Permissions.Sales.ViewAll),
            P(Permissions.Sales.ManageInstallments, "Quản lý trả góp", PermissionType.Manage, Permissions.Sales.ViewAll),
            P(Permissions.Sales.Quotations.View, "Xem báo giá", PermissionType.View),
            P(Permissions.Sales.Quotations.Create, "Tạo báo giá", PermissionType.Create, Permissions.Sales.Quotations.View),
            P(Permissions.Sales.Quotations.Edit, "Sửa báo giá", PermissionType.Edit, Permissions.Sales.Quotations.View),
            P(Permissions.Sales.Quotations.Approve, "Duyệt báo giá", PermissionType.Approve, Permissions.Sales.Quotations.View));

        Module("Inventory", "Kho",
            P(Permissions.Inventory.ViewStock, "Xem tồn kho", PermissionType.View),
            P(Permissions.Inventory.ManageStock, "Nhập/xuất kho", PermissionType.Manage, Permissions.Inventory.ViewStock),
            P(Permissions.Inventory.AdjustStock, "Điều chỉnh tồn kho, kiểm kê", PermissionType.Edit, Permissions.Inventory.ViewStock),
            P(Permissions.Inventory.ViewSupplier, "Xem nhà cung cấp", PermissionType.View),
            P(Permissions.Inventory.CreateSupplier, "Thêm nhà cung cấp", PermissionType.Create, Permissions.Inventory.ViewSupplier),
            P(Permissions.Inventory.UpdateSupplier, "Sửa nhà cung cấp", PermissionType.Edit, Permissions.Inventory.ViewSupplier),
            P(Permissions.Inventory.DeleteSupplier, "Xoá nhà cung cấp", PermissionType.Delete, Permissions.Inventory.ViewSupplier),
            P(Permissions.Inventory.ViewPurchaseOrder, "Xem đơn mua hàng", PermissionType.View),
            P(Permissions.Inventory.CreatePurchaseOrder, "Tạo đơn mua / đề nghị mua", PermissionType.Create, Permissions.Inventory.ViewPurchaseOrder),
            P(Permissions.Inventory.ApprovePurchaseOrder, "Duyệt đơn mua hàng", PermissionType.Approve, Permissions.Inventory.ViewPurchaseOrder),
            P(Permissions.Inventory.ReceivePurchaseOrder, "Nhận hàng nhập kho (GRN)", PermissionType.Manage, Permissions.Inventory.ViewPurchaseOrder),
            P(Permissions.Inventory.ViewReservations, "Xem hàng giữ chỗ", PermissionType.View),
            P(Permissions.Inventory.Approve, "Duyệt nghiệp vụ kho (gồm chuyển kho một bước)", PermissionType.Approve, Permissions.Inventory.ViewStock),
            P(Permissions.Inventory.ImportOpening, "Nhập tồn đầu kỳ", PermissionType.Create, Permissions.Inventory.ManageStock),
            P(Permissions.Inventory.QuickReceive, "Nhập nhanh không cần đơn mua", PermissionType.Create, Permissions.Inventory.ManageStock),
            P(Permissions.Inventory.Export, "Xuất báo cáo kho", PermissionType.Export, Permissions.Inventory.ViewStock));

        Module("Payments", "Thanh toán",
            P(Permissions.Payments.View, "Xem giao dịch thanh toán", PermissionType.View),
            P(Permissions.Payments.Reconcile, "Đối soát sao kê ngân hàng", PermissionType.Manage, Permissions.Payments.View),
            P(Permissions.Payments.Refund, "Hoàn tiền", PermissionType.Approve, Permissions.Payments.View),
            P(Permissions.Payments.CollectCod, "Xác nhận thu COD", PermissionType.Manage, Permissions.Payments.View),
            P(Permissions.Payments.Configure, "Cấu hình cổng thanh toán", PermissionType.Manage, Permissions.Payments.View));

        Module("Repair", "Sửa chữa",
            P(Permissions.Repair.Book, "Đặt lịch sửa chữa", PermissionType.Create),
            P(Permissions.Repair.ViewOwn, "Xem phiếu sửa chữa của mình", PermissionType.View),
            P(Permissions.Repair.ViewAll, "Xem tất cả phiếu sửa chữa", PermissionType.View),
            P(Permissions.Repair.UpdateStatus, "Cập nhật tiến độ sửa chữa", PermissionType.Edit, Permissions.Repair.ViewAll),
            P(Permissions.Repair.AssignTechnician, "Phân công kỹ thuật viên", PermissionType.Manage, Permissions.Repair.ViewAll),
            P(Permissions.Repair.CreateQuote, "Lập báo giá sửa chữa", PermissionType.Create, Permissions.Repair.ViewAll),
            P(Permissions.Repair.ApproveQuote, "Duyệt báo giá sửa chữa", PermissionType.Approve, Permissions.Repair.ViewAll),
            P(Permissions.Repair.Complete, "Hoàn tất phiếu sửa chữa", PermissionType.Manage, Permissions.Repair.ViewAll),
            P(Permissions.Repair.ManageServiceTypes, "Quản lý danh mục dịch vụ sửa chữa", PermissionType.Manage, Permissions.Repair.ViewAll));

        Module("Warranty", "Bảo hành",
            P(Permissions.Warranty.SubmitClaim, "Gửi yêu cầu bảo hành", PermissionType.Create),
            P(Permissions.Warranty.ViewOwn, "Xem yêu cầu bảo hành của mình", PermissionType.View),
            P(Permissions.Warranty.ViewAll, "Xem tất cả yêu cầu bảo hành", PermissionType.View),
            P(Permissions.Warranty.ReviewClaim, "Xử lý yêu cầu bảo hành", PermissionType.Manage, Permissions.Warranty.ViewAll),
            P(Permissions.Warranty.ApproveClaim, "Duyệt yêu cầu bảo hành", PermissionType.Approve, Permissions.Warranty.ViewAll),
            P(Permissions.Warranty.Moderate, "Kiểm duyệt nội dung khách gửi kèm", PermissionType.Manage, Permissions.Warranty.ViewAll));

        Module("Content", "Nội dung",
            P(Permissions.Content.ViewPages, "Xem trang tĩnh", PermissionType.View),
            P(Permissions.Content.ManagePages, "Quản lý trang tĩnh", PermissionType.Manage, Permissions.Content.ViewPages),
            P(Permissions.Content.ViewPosts, "Xem bài viết", PermissionType.View),
            P(Permissions.Content.ManagePosts, "Quản lý bài viết", PermissionType.Manage, Permissions.Content.ViewPosts),
            P(Permissions.Content.ViewCoupons, "Xem mã giảm giá", PermissionType.View),
            P(Permissions.Content.ManageCoupons, "Quản lý mã giảm giá, khuyến mãi", PermissionType.Manage, Permissions.Content.ViewCoupons),
            P(Permissions.Content.ViewBanners, "Xem banner", PermissionType.View),
            P(Permissions.Content.ManageBanners, "Quản lý banner trang chủ", PermissionType.Manage, Permissions.Content.ViewBanners),
            P(Permissions.Content.ManageMedia, "Tải lên và quản lý thư viện ảnh", PermissionType.Manage, Permissions.Content.ViewPages),
            P(Permissions.Content.ManageMenus, "Quản lý menu điều hướng", PermissionType.Manage, Permissions.Content.ViewPages),
            P(Permissions.Content.ManageContacts, "Xử lý liên hệ từ website", PermissionType.Manage, Permissions.Content.ViewPages),
            P(Permissions.Content.ViewRedirects, "Xem bảng chuyển hướng URL", PermissionType.View),
            P(Permissions.Content.ManageRedirects, "Quản lý chuyển hướng URL (301/302/410), nhập/xuất CSV", PermissionType.Manage, Permissions.Content.ViewRedirects));

        Module("CRM", "Khách hàng",
            P(Permissions.CRM.ViewCustomers, "Xem khách hàng", PermissionType.View),
            P(Permissions.CRM.ManageCustomers, "Sửa thông tin khách hàng", PermissionType.Manage, Permissions.CRM.ViewCustomers),
            P(Permissions.CRM.ViewLeads, "Xem khách hàng tiềm năng", PermissionType.View),
            P(Permissions.CRM.ManageLeads, "Quản lý khách hàng tiềm năng", PermissionType.Manage, Permissions.CRM.ViewLeads),
            P(Permissions.CRM.ViewSegments, "Xem tệp khách hàng", PermissionType.View),
            P(Permissions.CRM.ManageSegments, "Quản lý tệp khách hàng", PermissionType.Manage, Permissions.CRM.ViewSegments),
            P(Permissions.CRM.ViewAnalytics, "Xem phân tích khách hàng", PermissionType.View),
            P(Permissions.CRM.ManageTasks, "Quản lý công việc chăm sóc KH", PermissionType.Manage, Permissions.CRM.ViewCustomers),
            P(Permissions.CRM.ViewCampaigns, "Xem chiến dịch marketing", PermissionType.View),
            P(Permissions.CRM.ManageCampaigns, "Soạn chiến dịch marketing", PermissionType.Manage, Permissions.CRM.ViewCampaigns),
            P(Permissions.CRM.SendCampaigns, "Gửi chiến dịch (email/SMS) thật", PermissionType.Approve, Permissions.CRM.ManageCampaigns));

        Module("Accounting", "Kế toán",
            P(Permissions.Accounting.ViewInvoices, "Xem hoá đơn, sổ sách", PermissionType.View),
            P(Permissions.Accounting.CreateInvoice, "Tạo hoá đơn", PermissionType.Create, Permissions.Accounting.ViewInvoices),
            P(Permissions.Accounting.EditInvoice, "Sửa hoá đơn", PermissionType.Edit, Permissions.Accounting.ViewInvoices),
            P(Permissions.Accounting.DeleteInvoice, "Xoá/huỷ hoá đơn", PermissionType.Delete, Permissions.Accounting.ViewInvoices),
            P(Permissions.Accounting.ManageInvoices, "Phát hành hoá đơn điện tử", PermissionType.Manage, Permissions.Accounting.ViewInvoices),
            P(Permissions.Accounting.ApproveCredit, "Duyệt hạn mức công nợ", PermissionType.Approve, Permissions.Accounting.ViewInvoices),
            P(Permissions.Accounting.ManageDebt, "Quản lý công nợ", PermissionType.Manage, Permissions.Accounting.ViewInvoices),
            P(Permissions.Accounting.ManageExpense, "Quản lý chi phí", PermissionType.Manage, Permissions.Accounting.ViewInvoices),
            P(Permissions.Accounting.ViewReports, "Xem báo cáo kế toán", PermissionType.View, Permissions.Accounting.ViewInvoices),
            P(Permissions.Accounting.Export, "Xuất báo cáo tài chính", PermissionType.Export, Permissions.Accounting.ViewInvoices));

        Module("HR", "Nhân sự",
            P(Permissions.HR.ViewEmployees, "Xem hồ sơ nhân viên", PermissionType.View),
            P(Permissions.HR.ManageEmployees, "Quản lý hồ sơ, hợp đồng nhân viên", PermissionType.Manage, Permissions.HR.ViewEmployees),
            P(Permissions.HR.ViewAttendance, "Xem chấm công", PermissionType.View),
            P(Permissions.HR.ManageAttendance, "Quản lý chấm công, ca làm", PermissionType.Manage, Permissions.HR.ViewAttendance),
            P(Permissions.HR.ApproveLeave, "Duyệt nghỉ phép, tăng ca", PermissionType.Approve, Permissions.HR.ViewAttendance),
            P(Permissions.HR.ViewPayroll, "Xem bảng lương", PermissionType.View),
            P(Permissions.HR.ManagePayroll, "Tính và chốt bảng lương", PermissionType.Manage, Permissions.HR.ViewPayroll),
            P(Permissions.HR.ManageStatutoryParameters, "Sửa tham số lương/thuế/bảo hiểm theo luật", PermissionType.Manage, Permissions.HR.ViewPayroll));

        Module("Users", "Người dùng",
            P(Permissions.Users.View, "Xem danh sách tài khoản", PermissionType.View),
            P(Permissions.Users.Create, "Tạo tài khoản mới", PermissionType.Create, Permissions.Users.View),
            P(Permissions.Users.Edit, "Sửa thông tin tài khoản", PermissionType.Edit, Permissions.Users.View),
            P(Permissions.Users.Delete, "Khoá/xoá tài khoản", PermissionType.Delete, Permissions.Users.View),
            P(Permissions.Users.ManageRoles, "Gán vai trò cho tài khoản", PermissionType.Manage, Permissions.Users.View));

        Module("Roles", "Vai trò",
            P(Permissions.Roles.View, "Xem vai trò và ma trận quyền", PermissionType.View),
            P(Permissions.Roles.Create, "Tạo vai trò mới", PermissionType.Create, Permissions.Roles.View),
            P(Permissions.Roles.Edit, "Sửa quyền của vai trò", PermissionType.Edit, Permissions.Roles.View),
            P(Permissions.Roles.Delete, "Xoá vai trò", PermissionType.Delete, Permissions.Roles.View));

        Module("Reporting", "Báo cáo",
            P(Permissions.Reporting.ViewSales, "Xem báo cáo bán hàng", PermissionType.View),
            P(Permissions.Reporting.ViewInventory, "Xem báo cáo kho", PermissionType.View),
            P(Permissions.Reporting.ViewFinancial, "Xem báo cáo tài chính", PermissionType.View),
            P(Permissions.Reporting.ViewRepair, "Xem báo cáo sửa chữa", PermissionType.View),
            P(Permissions.Reporting.ViewHR, "Xem báo cáo nhân sự", PermissionType.View),
            P(Permissions.Reporting.ExportReports, "Xuất báo cáo ra file", PermissionType.Export));

        Module("System", "Hệ thống",
            P(Permissions.System.ViewConfig, "Xem cấu hình hệ thống", PermissionType.View),
            P(Permissions.System.ManageConfig, "Thay đổi cấu hình hệ thống", PermissionType.Manage, Permissions.System.ViewConfig),
            P(Permissions.System.ViewLogs, "Xem nhật ký hệ thống", PermissionType.View),
            P(Permissions.System.ManageLogs, "Xoá/xuất nhật ký hệ thống", PermissionType.Manage, Permissions.System.ViewLogs),
            P(Permissions.System.ManageBackups, "Sao lưu và phục hồi dữ liệu", PermissionType.Manage, Permissions.System.ViewConfig));

        return all;
    }
}
