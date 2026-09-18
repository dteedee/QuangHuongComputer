using System.Text.Json;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using BuildingBlocks.TaxEngine;
using BuildingBlocks.Time;
using HR.Application.Statutory;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace HR.Endpoints.Statutory;

/// <summary>
/// W2-25 / D06 §3 — API tham số lương/thuế/bảo hiểm hiệu lực theo ngày.
///
/// Đọc: <c>HR.ViewPayroll</c>. Ghi: <c>HR.ManageStatutoryParameters</c> (Admin, Accountant — HR chỉ
/// được xem). Mọi thay đổi vào audit log. Dòng đã được dùng cho kỳ lương ĐÃ TRẢ trả 409:
/// **đổi luật = THÊM mốc hiệu lực mới, không sửa mốc cũ**.
/// </summary>
public static class StatutoryParameterEndpoints
{
    private const string Module = "HR";
    private const string Entity = "StatutoryParameter";

    public static void MapStatutoryParameterEndpoints(this IEndpointRouteBuilder app)
    {
        const string Base = "/api/hr/statutory-parameters";

        var read = app.MapGroup(Base).RequirePermission(Permissions.HR.ViewPayroll);
        var write = app.MapGroup(Base).RequirePermission(Permissions.HR.ManageStatutoryParameters);

        // GET /api/hr/statutory-parameters?code=&asOf=
        // Không có asOf: toàn bộ lịch sử mốc hiệu lực. Có asOf: bộ ĐANG có hiệu lực tại ngày đó.
        read.MapGet("", async (StatutoryParameterAdminService svc, string? code, DateOnly? asOf, CancellationToken ct) =>
            Results.Ok(await svc.ListAsync(code, asOf, ct)));

        // GET /api/hr/statutory-parameters/resolved?asOf=  — bộ đã resolve (số dùng để tính lương).
        read.MapGet("/resolved", async (
            HrStatutoryParameterProvider provider,
            IBusinessClock clock,
            DateOnly? asOf,
            CancellationToken ct) =>
        {
            // D06 §3: mọi "hôm nay" trong luồng lương-thuế lấy theo giờ VN, không phải UTC —
            // lệch 7h làm hỏng đúng hai mốc 01/01/2026 và 01/07/2026.
            var date = asOf ?? clock.TodayVn;
            var set = await provider.ResolveAsync(date, ct);
            return Results.Ok(new
            {
                asOf = date,
                set.PitPersonalDeduction,
                set.PitDependentDeduction,
                set.PitBrackets,
                set.PitFlatRate,
                set.PitFlatThreshold,
                pitOvertimeExemptMode = set.PitOvertimeExemptMode.ToString(),
                set.PitMealTaxFreeCap,
                set.SiReferenceLevel,
                socialInsuranceCap = set.SocialInsuranceCap,
                companyWageRegion = set.CompanyWageRegion.ToString(),
                unemploymentCap = set.UnemploymentCapFor(set.CompanyWageRegion),
                regionalMinWage = set.MinWageFor(set.CompanyWageRegion),
                rates = set.Rates,
                overtimeMultipliers = set.OvertimeMultipliers,
                overtimeLimits = set.OvertimeLimits,
                set.ProbationMinRatio,
                legalBasis = set.SourceRows.ToDictionary(
                    kv => kv.Key,
                    kv => new { kv.Value.EffectiveFrom, kv.Value.LegalBasis, kv.Value.SourceUrl, kv.Value.IsVerified })
            });
        });

        // GET /api/hr/statutory-parameters/codes — danh mục mã hợp lệ cho form "Thêm mốc mới".
        read.MapGet("/codes", () => Results.Ok(StatutoryParameterCodes.All));

        write.MapPost("", async (
            CreateStatutoryParameterDto dto,
            StatutoryParameterAdminService svc,
            HttpContext http,
            CancellationToken ct) =>
        {
            var created = await svc.CreateAsync(dto, ct);
            await http.LogAuditAsync("Create", Entity, created.Id.ToString(),
                $"Thêm mốc {created.Code} hiệu lực {created.EffectiveFrom:dd/MM/yyyy}. Lý do: {dto.Reason ?? "(không ghi)"}",
                Module, oldValues: null, newValues: JsonSerializer.Serialize(created));
            return Results.Created($"/api/hr/statutory-parameters/{created.Id}", created);
        });

        write.MapPut("/{id:guid}", async (
            Guid id,
            UpdateStatutoryParameterDto dto,
            StatutoryParameterAdminService svc,
            HttpContext http,
            CancellationToken ct) =>
        {
            var before = (await svc.ListAsync(null, null, ct)).FirstOrDefault(p => p.Id == id);
            var updated = await svc.UpdateAsync(id, dto, ct);
            await http.LogAuditAsync("Update", Entity, id.ToString(),
                $"Sửa {updated.Code}@{updated.EffectiveFrom:dd/MM/yyyy}. Lý do: {dto.Reason ?? "(không ghi)"}",
                Module,
                oldValues: before is null ? null : JsonSerializer.Serialize(before),
                newValues: JsonSerializer.Serialize(updated));
            return Results.Ok(updated);
        });

        write.MapDelete("/{id:guid}", async (
            Guid id,
            StatutoryParameterAdminService svc,
            HttpContext http,
            CancellationToken ct) =>
        {
            var before = (await svc.ListAsync(null, null, ct)).FirstOrDefault(p => p.Id == id);
            await svc.DeleteAsync(id, ct);
            await http.LogAuditAsync("Delete", Entity, id.ToString(),
                $"Xoá mốc {before?.Code}@{before?.EffectiveFrom:dd/MM/yyyy}", Module,
                oldValues: before is null ? null : JsonSerializer.Serialize(before), newValues: null);
            return Results.NoContent();
        });
    }
}
