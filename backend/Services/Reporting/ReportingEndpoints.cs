using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Reporting.Endpoints;

namespace Reporting;

public static class ReportingEndpoints
{
    public static void MapReportingEndpoints(this IEndpointRouteBuilder app)
    {
        // TODO(W1-10): role-string stop-gap so accountant@ isn't 403'd on every
        // financial/tax report. Not permission-policy based like the rest of the system;
        // the endpoint-authorization-sweep track should replace this with per-report
        // permissions (see finding audit-be-crm-comm-ai-reporting.md #-18).
        var group = app.MapGroup("/api/reports")
            .RequireAuthorization(policy => policy.RequireRole("Admin", "Manager", "Accountant"));

        group.MapSalesReportEndpoints();
        group.MapFinancialReportEndpoints();
        group.MapInventoryReportEndpoints();
        group.MapRepairReportEndpoints();
        group.MapAnalyticsEndpoints();
        group.MapSystemHealthEndpoints();
        group.MapExcelExportEndpoints();
        group.MapWarrantyReportEndpoints();
        group.MapCRMReportEndpoints();
        group.MapTaxReportEndpoints();
        group.MapComparisonEndpoints();
        group.MapReportCustomizationEndpoints();

        // HR reports live in their own sub-group (same /api/reports prefix, mapped
        // separately from `group`) so `HR` role can read HR reports without also being
        // granted Admin/Manager/Accountant's access to financial/sales/tax reports.
        var hrGroup = app.MapGroup("/api/reports")
            .RequireAuthorization(policy => policy.RequireRole("Admin", "Manager", "Accountant", "HR"));
        hrGroup.MapHRReportEndpoints();
    }
}
