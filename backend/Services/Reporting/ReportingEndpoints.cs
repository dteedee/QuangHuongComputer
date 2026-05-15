using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Reporting.Endpoints;

namespace Reporting;

public static class ReportingEndpoints
{
    public static void MapReportingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/reports")
            .RequireAuthorization(policy => policy.RequireRole("Admin", "Manager"));

        group.MapSalesReportEndpoints();
        group.MapFinancialReportEndpoints();
        group.MapInventoryReportEndpoints();
        group.MapRepairReportEndpoints();
        group.MapAnalyticsEndpoints();
        group.MapSystemHealthEndpoints();
        group.MapExcelExportEndpoints();
        group.MapHRReportEndpoints();
        group.MapWarrantyReportEndpoints();
        group.MapCRMReportEndpoints();
        group.MapTaxReportEndpoints();
        group.MapComparisonEndpoints();
        group.MapReportCustomizationEndpoints();
    }
}
