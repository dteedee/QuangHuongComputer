using BuildingBlocks.Security;
using BuildingBlocks.SharedKernel;
using BuildingBlocks.TaxEngine;
using BuildingBlocks.Time;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using VietnameseTaxEngine = BuildingBlocks.TaxEngine.VietnameseTaxEngine;

namespace Accounting.Endpoints;

/// <summary>
/// Máy tính thuế (TNCN, BHXH, GTGT, TNDN). Chỉ tính toán, không đụng dữ liệu —
/// khác hẳn <c>/api/accounting/tax-reports</c> (báo cáo thuế, thuộc W2-25).
/// </summary>
public static class TaxCalculatorEndpoints
{
    public static void MapTaxCalculatorEndpoints(this IEndpointRouteBuilder app)
    {
        // Nhóm lồng tự khai báo quyền của chính nó — fail-closed nếu convention của nhóm cha đổi.
        var group = app.MapGroup("/api/accounting/tax")
            .RequireModulePermissions(PermissionModules.Accounting);

        group.MapPost("/pit", (PitCalculationRequest request) => Results.Ok(
            VietnameseTaxEngine.CalculateMonthlyPit(
                request.GrossSalary, request.NumberOfDependents, request.SocialInsurance,
                request.HealthInsurance, request.UnemploymentInsurance, request.OtherDeductions)))
            .WithName("CalculatePIT");

        group.MapPost("/insurance", (InsuranceCalculationRequest request) => Results.Ok(
            VietnameseTaxEngine.CalculateInsurance(request.GrossSalary, request.RegionalMinSalary)))
            .WithName("CalculateInsurance");

        group.MapPost("/vat", (VatCalculationRequest request, IBusinessClock clock) =>
        {
            // Thuế suất mặc định KHÔNG còn là hằng số 8%: nó phụ thuộc NGÀY (D01 — 10% từ 01/01/2027).
            var statutory = (request.VatStatutoryRate ?? TaxRates.VatStatutoryStandard * 100m) / 100m;
            var rate = VatRateResolver.Resolve(
                statutory, request.VatReductionEligible, request.BusinessDate ?? clock.TodayVn,
                VatReductionWindow.Legal);

            var result = request.IsInclusive
                ? VietnameseTaxEngine.ExtractVat(request.Amount, rate)
                : VietnameseTaxEngine.CalculateVat(request.Amount, rate);

            return Results.Ok(result);
        }).WithName("CalculateVAT");

        group.MapPost("/cit", (CitCalculationRequest request) => Results.Ok(
            VietnameseTaxEngine.CalculateCit(request.Revenue, request.DeductibleExpenses)))
            .WithName("CalculateCIT");

        group.MapPost("/payroll", (PayrollCalculationRequest request) => Results.Ok(
            VietnameseTaxEngine.CalculatePayroll(
                request.GrossSalary, request.NumberOfDependents,
                request.OtherDeductions, request.RegionalMinSalary)))
            .WithName("CalculatePayroll");

        group.MapGet("/rates", (IBusinessClock clock) =>
        {
            var window = VatReductionWindow.Legal;
            var today = clock.TodayVn;

            return Results.Ok(new
            {
                Pit = new
                {
                    PersonalDeduction = VietnameseTaxEngine.PersonalDeduction,
                    DependentDeduction = VietnameseTaxEngine.DependentDeduction
                },
                Insurance = new
                {
                    MaxInsurableSalary = VietnameseTaxEngine.MaxInsurableSalary,
                    BaseSalary = VietnameseTaxEngine.BaseSalary2025
                },
                Vat = new
                {
                    StatutoryStandard = TaxRates.VatStatutoryStandard,
                    EffectiveStandardToday = VatRateResolver.Resolve(TaxRates.VatStatutoryStandard, true, today, window),
                    ReductionActive = VatRateResolver.IsReductionActive(today, window),
                    window.From,
                    window.To,
                    window.LegalBasis
                },
                Cit = new { VietnameseTaxEngine.CitStandardRate },
                BusinessDate = today
            });
        }).WithName("GetTaxRates");
    }
}

public record PitCalculationRequest(
    decimal GrossSalary, int NumberOfDependents = 0, decimal SocialInsurance = 0,
    decimal HealthInsurance = 0, decimal UnemploymentInsurance = 0, decimal OtherDeductions = 0);

public record InsuranceCalculationRequest(decimal GrossSalary, decimal? RegionalMinSalary = null);

/// <param name="VatStatutoryRate">Thuế suất LUẬT ĐỊNH theo phần trăm. Bỏ trống = mức chuẩn (10).</param>
/// <param name="BusinessDate">Ngày giao dịch (giờ VN) để resolve mức giảm. Bỏ trống = hôm nay.</param>
public record VatCalculationRequest(
    decimal Amount,
    decimal? VatStatutoryRate = null,
    bool VatReductionEligible = true,
    bool IsInclusive = false,
    DateOnly? BusinessDate = null);

public record CitCalculationRequest(decimal Revenue, decimal DeductibleExpenses);

public record PayrollCalculationRequest(
    decimal GrossSalary, int NumberOfDependents = 0,
    decimal OtherDeductions = 0, decimal? RegionalMinSalary = null);
