using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using HR.Domain;
using HR.Infrastructure;

namespace HR;

/// <summary>
/// CRUD hợp đồng lao động + cảnh báo hết hạn.
/// </summary>
public static class ContractEndpoints
{
    public static void MapContractEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/contracts")
            .RequireAuthorization(p => p.RequireRole("Admin", "Manager", "Accountant"));

        group.MapGet("", async (HRDbContext db, Guid? employeeId, ContractStatus? status) =>
        {
            var q = db.EmploymentContracts.AsQueryable();
            if (employeeId.HasValue) q = q.Where(c => c.EmployeeId == employeeId.Value);
            if (status.HasValue) q = q.Where(c => c.Status == status.Value);
            return Results.Ok(await q.OrderByDescending(c => c.StartDate).ToListAsync());
        });

        group.MapGet("/{id:guid}", async (Guid id, HRDbContext db) =>
        {
            var c = await db.EmploymentContracts.FindAsync(id);
            return c != null ? Results.Ok(c) : Results.NotFound();
        });

        // GET /api/hr/contracts/expiring?days=30
        group.MapGet("/expiring", async (HRDbContext db, int days = 30) =>
        {
            var now = DateTime.UtcNow;
            var threshold = now.AddDays(days);
            var items = await db.EmploymentContracts
                .Where(c => c.Status == ContractStatus.Active && c.EndDate != null &&
                            c.EndDate >= now && c.EndDate <= threshold)
                .OrderBy(c => c.EndDate)
                .ToListAsync();
            return Results.Ok(items);
        });

        group.MapPost("", async (CreateContractDto dto, HRDbContext db) =>
        {
            try
            {
                var c = new EmploymentContract(dto.EmployeeId, dto.ContractNumber, dto.Type,
                    dto.StartDate, dto.EndDate, dto.ContractSalary, dto.InsurableSalary, dto.DocumentUrl);
                db.EmploymentContracts.Add(c);
                await db.SaveChangesAsync();
                return Results.Created($"/api/hr/contracts/{c.Id}", c);
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("/{id:guid}/activate", async (Guid id, HRDbContext db) =>
        {
            var c = await db.EmploymentContracts.FindAsync(id);
            if (c == null) return Results.NotFound();
            try { c.Activate(); await db.SaveChangesAsync(); return Results.Ok(c); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("/{id:guid}/terminate", async (Guid id, TerminateContractDto dto, HRDbContext db) =>
        {
            var c = await db.EmploymentContracts.FindAsync(id);
            if (c == null) return Results.NotFound();
            try
            {
                c.Terminate(dto.Reason, dto.TerminatedAt ?? DateTime.UtcNow);
                await db.SaveChangesAsync();
                return Results.Ok(c);
            }
            catch (Exception ex) when (ex is InvalidOperationException || ex is ArgumentException)
            { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapDelete("/{id:guid}", async (Guid id, HRDbContext db) =>
        {
            var c = await db.EmploymentContracts.FindAsync(id);
            if (c == null) return Results.NotFound();
            if (c.Status == ContractStatus.Active)
                return Results.BadRequest(new { error = "Không xoá được HĐ đang hiệu lực — hãy Terminate trước." });
            db.EmploymentContracts.Remove(c);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Deleted" });
        });
    }
}

public record CreateContractDto(
    Guid EmployeeId,
    string ContractNumber,
    ContractType Type,
    DateTime StartDate,
    DateTime? EndDate,
    decimal ContractSalary,
    decimal InsurableSalary,
    string? DocumentUrl);

public record TerminateContractDto(string Reason, DateTime? TerminatedAt);
