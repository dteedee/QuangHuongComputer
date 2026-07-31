using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using HR.Application.Tax;
using HR.Infrastructure;

namespace HR;

/// <summary>
/// API quyết toán thuế TNCN năm (mẫu 05/QTT-TNCN).
/// </summary>
public static class PitFinalizationEndpoints
{
    public static void MapPitFinalizationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/tax/pit-finalization")
            .RequireAuthorization(p => p.RequireRole("Admin", "Manager", "Accountant"));

        // GET /api/hr/tax/pit-finalization/{employeeId}?year=2026
        group.MapGet("/{employeeId:guid}", async (Guid employeeId, int year, HRDbContext db) =>
        {
            var svc = new PitFinalizationService(db);
            try
            {
                var result = await svc.FinalizeAsync(employeeId, year);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        });

        // GET /api/hr/tax/pit-finalization/summary?year=2026 — bảng tổng cho kế toán
        group.MapGet("/summary", async (int year, HRDbContext db) =>
        {
            var svc = new PitFinalizationService(db);
            var items = await svc.GetSummaryAsync(year);
            return Results.Ok(new
            {
                year,
                total = items.Count,
                totalGross = items.Sum(i => i.AnnualGrossIncome),
                totalPitRecalculated = items.Sum(i => i.RecalculatedAnnualPit),
                totalPitWithheld = items.Sum(i => i.MonthlyPitWithheldTotal),
                totalOverpayment = items.Sum(i => i.PitOverpayment),
                totalShortfall = items.Sum(i => i.PitShortfall),
                items
            });
        });

        // POST /api/hr/tax/pit-finalization/{employeeId}/export?year=2026 — mẫu 05/QTT-TNCN (giai đoạn 1: JSON)
        group.MapPost("/{employeeId:guid}/export", async (Guid employeeId, int year, HRDbContext db) =>
        {
            var svc = new PitFinalizationService(db);
            try
            {
                var r = await svc.FinalizeAsync(employeeId, year);
                var form = new
                {
                    template = "05/QTT-TNCN",
                    year = r.Year,
                    employee = new { r.EmployeeId, r.EmployeeName },
                    income = new { r.AnnualGrossIncome, r.AnnualInsurance },
                    deductions = new { r.AnnualPersonalDeduction, r.AnnualDependentDeduction, r.DependentMonthCount },
                    tax = new
                    {
                        r.AnnualTaxableIncome,
                        r.RecalculatedAnnualPit,
                        r.MonthlyPitWithheldTotal,
                        r.PitOverpayment,
                        r.PitShortfall
                    },
                    generatedAt = DateTime.UtcNow,
                    note = "PDF sẽ được xuất ở phase tiếp theo — hiện tại trả JSON để kế toán đối chiếu."
                };
                return Results.Ok(form);
            }
            catch (InvalidOperationException ex)
            {
                return Results.NotFound(new { error = ex.Message });
            }
        });
    }
}
