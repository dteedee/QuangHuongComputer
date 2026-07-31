using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Domain;
using HR.Infrastructure;

namespace HR;

/// <summary>
/// CRUD người phụ thuộc — dùng để giảm trừ gia cảnh 4.4tr/tháng theo TT 111/2013.
/// </summary>
public static class DependentEndpoints
{
    public static void MapDependentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/employees/{eid:guid}/dependents")
            .RequireAuthorization(p => p.RequireRole("Admin", "Manager", "Accountant"));

        group.MapGet("", async (Guid eid, HRDbContext db) =>
        {
            var items = await db.Dependents.Where(d => d.EmployeeId == eid)
                .OrderByDescending(d => d.DeductionStartDate).ToListAsync();
            return Results.Ok(items);
        });

        group.MapGet("/active", async (Guid eid, HRDbContext db) =>
        {
            var now = DateTime.UtcNow;
            var items = await db.Dependents
                .Where(d => d.EmployeeId == eid && d.DeductionStartDate <= now &&
                            (d.DeductionEndDate == null || d.DeductionEndDate >= now))
                .ToListAsync();
            return Results.Ok(items);
        });

        group.MapPost("", async (Guid eid, CreateDependentDto dto, HRDbContext db) =>
        {
            try
            {
                var dep = new Dependent(eid, dto.FullName, dto.Relation, dto.BirthDate,
                    dto.DeductionStartDate, dto.DeductionEndDate, dto.TaxCode);
                db.Dependents.Add(dep);
                await db.SaveChangesAsync();
                await SyncEmployeeDependentCount(db, eid);
                return Results.Created($"/api/hr/employees/{eid}/dependents/{dep.Id}", dep);
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPut("/{id:guid}", async (Guid eid, Guid id, UpdateDependentDto dto, HRDbContext db) =>
        {
            var dep = await db.Dependents.FindAsync(id);
            if (dep == null || dep.EmployeeId != eid) return Results.NotFound();
            try
            {
                dep.UpdateInfo(dto.FullName, dto.Relation, dto.BirthDate, dto.TaxCode);
                if (dto.DeductionEndDate.HasValue) dep.EndDeduction(dto.DeductionEndDate.Value);
                await db.SaveChangesAsync();
                await SyncEmployeeDependentCount(db, eid);
                return Results.Ok(dep);
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapDelete("/{id:guid}", async (Guid eid, Guid id, HRDbContext db) =>
        {
            var dep = await db.Dependents.FindAsync(id);
            if (dep == null || dep.EmployeeId != eid) return Results.NotFound();
            db.Dependents.Remove(dep);
            await db.SaveChangesAsync();
            await SyncEmployeeDependentCount(db, eid);
            return Results.Ok(new { message = "Deleted" });
        });
    }

    private static async Task SyncEmployeeDependentCount(HRDbContext db, Guid employeeId)
    {
        var emp = await db.Employees.FindAsync(employeeId);
        if (emp == null) return;
        var now = DateTime.UtcNow;
        var count = await db.Dependents.CountAsync(d =>
            d.EmployeeId == employeeId && d.DeductionStartDate <= now &&
            (d.DeductionEndDate == null || d.DeductionEndDate >= now));
        emp.RefreshDependentCount(count);
        await db.SaveChangesAsync();
    }
}

public record CreateDependentDto(
    string FullName,
    DependentRelation Relation,
    DateTime BirthDate,
    DateTime DeductionStartDate,
    DateTime? DeductionEndDate,
    string? TaxCode);

public record UpdateDependentDto(
    string FullName,
    DependentRelation Relation,
    DateTime BirthDate,
    string? TaxCode,
    DateTime? DeductionEndDate);
