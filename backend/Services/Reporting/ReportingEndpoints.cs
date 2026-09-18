using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Reporting.Endpoints;

namespace Reporting;

public static class ReportingEndpoints
{
    public static void MapReportingEndpoints(this IEndpointRouteBuilder app)
    {
        // W1-10: hết stop-gap role-string. Mỗi mảng báo cáo là một nhóm riêng trên cùng
        // tiền tố /api/reports nhưng mang đúng quyền của mảng đó, nhờ vậy Accountant đọc được
        // báo cáo tài chính/thuế, HR đọc báo cáo nhân sự, InventoryStaff đọc báo cáo kho,
        // kỹ thuật viên đọc báo cáo sửa chữa — thay vì một danh sách role chung.
        Group(app, Permissions.Reporting.ViewSales).MapSalesReportEndpoints();
        Group(app, Permissions.Reporting.ViewFinancial).MapFinancialReportEndpoints();
        Group(app, Permissions.Reporting.ViewInventory).MapInventoryReportEndpoints();
        Group(app, Permissions.Reporting.ViewRepair).MapRepairReportEndpoints();
        Group(app, Permissions.Reporting.ViewSales).MapAnalyticsEndpoints();
        Group(app, Permissions.System.ViewConfig).MapSystemHealthEndpoints();
        Group(app, Permissions.Reporting.ExportReports).MapExcelExportEndpoints();
        Group(app, Permissions.Reporting.ViewRepair).MapWarrantyReportEndpoints();
        Group(app, Permissions.CRM.ViewAnalytics).MapCRMReportEndpoints();
        Group(app, Permissions.Reporting.ViewFinancial).MapTaxReportEndpoints();
        Group(app, Permissions.Reporting.ViewSales).MapComparisonEndpoints();
        Group(app, Permissions.Reporting.ExportReports).MapReportCustomizationEndpoints();
        Group(app, Permissions.Reporting.ViewHR).MapHRReportEndpoints();
        Group(app, Permissions.Reporting.ViewSales).MapPromotionEffectivenessEndpoints(); // D10
    }

    /// <summary>
    /// Một nhóm /api/reports mang đúng MỘT quyền cho mọi verb. Báo cáo chỉ có thao tác đọc
    /// và xuất file, nên ánh xạ theo verb (GET/POST/PUT...) không có ý nghĩa ở đây.
    /// </summary>
    private static RouteGroupBuilder Group(IEndpointRouteBuilder app, string permission) =>
        app.MapGroup("/api/reports").RequirePermission(permission);
}
