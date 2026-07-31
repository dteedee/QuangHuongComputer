using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Domain;
using HR.Infrastructure;

namespace HR;

/// <summary>
/// Quản lý cơ cấu lương (lịch sử) + phụ cấp của nhân viên.
/// </summary>
public static class SalaryStructureEndpoints
{
    public static void MapSalaryStructureEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/employees/{eid:guid}/salary-structures")
            .RequireAuthorization(p => p.RequireRole("Admin", "Manager", "Accountant"));

        group.MapGet("", async (Guid eid, HRDbContext db) =>
        {
            var items = await db.SalaryStructures.Where(s => s.EmployeeId == eid)
                .OrderByDescending(s => s.EffectiveDate).ToListAsync();
            return Results.Ok(items);
        });

        // GET /api/hr/employees/{eid}/salary-structures/effective?date=2026-07-31
        group.MapGet("/effective", async (Guid eid, HRDbContext db, DateTime? date) =>
        {
            var d = date ?? DateTime.UtcNow;
            var items = await db.SalaryStructures.Where(s => s.EmployeeId == eid).ToListAsync();
            var effective = items.GetEffectiveOn(d);
            return effective != null ? Results.Ok(effective) : Results.NotFound();
        });

        group.MapPost("", async (Guid eid, CreateSalaryStructureDto dto, HRDbContext db) =>
        {
            try
            {
                // Đóng record đang mở (nếu có) tại ngày kề trước EffectiveDate
                var openOnes = await db.SalaryStructures
                    .Where(s => s.EmployeeId == eid && s.EndDate == null)
                    .ToListAsync();
                foreach (var s in openOnes) s.CloseAt(dto.EffectiveDate.AddDays(-1));

                var newStr = new SalaryStructure(eid, dto.BaseSalary, dto.InsurableSalary,
                    dto.EffectiveDate, dto.Coefficient, dto.EndDate, dto.Note);
                db.SalaryStructures.Add(newStr);
                await db.SaveChangesAsync();
                return Results.Created($"/api/hr/employees/{eid}/salary-structures/{newStr.Id}", newStr);
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapDelete("/{id:guid}", async (Guid eid, Guid id, HRDbContext db) =>
        {
            var s = await db.SalaryStructures.FindAsync(id);
            if (s == null || s.EmployeeId != eid) return Results.NotFound();
            db.SalaryStructures.Remove(s);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Deleted" });
        });

        // ===== Allowances (gắn cùng route employee) =====
        var allowanceGroup = app.MapGroup("/api/hr/employees/{eid:guid}/allowances")
            .RequireAuthorization(p => p.RequireRole("Admin", "Manager", "Accountant"));

        allowanceGroup.MapGet("", async (Guid eid, HRDbContext db) =>
        {
            var items = await db.Allowances.Where(a => a.EmployeeId == eid)
                .OrderByDescending(a => a.EffectiveDate).ToListAsync();
            return Results.Ok(items);
        });

        allowanceGroup.MapPost("", async (Guid eid, CreateAllowanceDto dto, HRDbContext db) =>
        {
            try
            {
                var a = new Allowance(eid, dto.AllowanceTypeId, dto.Amount, dto.EffectiveDate, dto.EndDate);
                db.Allowances.Add(a);
                await db.SaveChangesAsync();
                return Results.Created($"/api/hr/employees/{eid}/allowances/{a.Id}", a);
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        allowanceGroup.MapDelete("/{id:guid}", async (Guid eid, Guid id, HRDbContext db) =>
        {
            var a = await db.Allowances.FindAsync(id);
            if (a == null || a.EmployeeId != eid) return Results.NotFound();
            db.Allowances.Remove(a);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Deleted" });
        });

        // ===== AllowanceType (catalog toàn hệ thống) =====
        var typeGroup = app.MapGroup("/api/hr/allowance-types")
            .RequireAuthorization(p => p.RequireRole("Admin", "Manager", "Accountant"));

        typeGroup.MapGet("", async (HRDbContext db) =>
            Results.Ok(await db.AllowanceTypes.OrderBy(t => t.Code).ToListAsync()));

        typeGroup.MapPost("/seed-defaults", async (HRDbContext db) =>
        {
            var existing = await db.AllowanceTypes.Select(t => t.Code).ToListAsync();
            var toAdd = AllowanceType.GetDefaults().Where(t => !existing.Contains(t.Code)).ToList();
            db.AllowanceTypes.AddRange(toAdd);
            await db.SaveChangesAsync();
            return Results.Ok(new { added = toAdd.Count, total = existing.Count + toAdd.Count });
        });
    }
}

public record CreateSalaryStructureDto(
    decimal BaseSalary,
    decimal InsurableSalary,
    DateTime EffectiveDate,
    decimal? Coefficient,
    DateTime? EndDate,
    string? Note);

public record CreateAllowanceDto(
    Guid AllowanceTypeId,
    decimal Amount,
    DateTime EffectiveDate,
    DateTime? EndDate);
