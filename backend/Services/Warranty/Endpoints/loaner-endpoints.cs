using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Warranty.Domain;
using Warranty.Infrastructure;

namespace Warranty;

/// <summary>
/// Phase 07 / W2-6: máy cho mượn khi khách bảo hành lâu (đặc biệt lúc gửi hãng).
/// Không import Inventory.Domain — mọi liên kết qua Guid.
/// </summary>
public static class LoanerDeviceEndpoints
{
    public static void MapLoanerDeviceEndpoints(this IEndpointRouteBuilder app)
    {
        // W1-10: GET -> Warranty.ViewAll, POST/PUT -> Warranty.ReviewClaim, DELETE -> ApproveClaim.
        var group = app.MapGroup("/api/warranty/loaner-devices")
            .RequireModulePermissions(PermissionModules.Warranty);

        group.MapGet("/", async (
            WarrantyDbContext db,
            HttpResponse response,
            [FromQuery] string? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20) =>
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 200);
            var q = db.LoanerDevices.AsQueryable();
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<LoanerStatus>(status, true, out var s))
                q = q.Where(l => l.Status == s);

            var total = await q.CountAsync();
            response.Headers["X-Total-Count"] = total.ToString();

            var list = await q.OrderByDescending(l => l.LoanedDate)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .ToListAsync();
            return Results.Ok(list);
        });

        group.MapGet("/{id:guid}", async (Guid id, WarrantyDbContext db) =>
        {
            var l = await db.LoanerDevices.FindAsync(id);
            return l == null ? Results.NotFound() : Results.Ok(l);
        });

        group.MapPost("/", async ([FromBody] CreateLoanerDeviceDto dto, WarrantyDbContext db) =>
        {
            try
            {
                var l = new LoanerDevice(
                    serialNumberId: dto.SerialNumberId,
                    serialNumber: dto.SerialNumber,
                    customerId: dto.CustomerId,
                    warrantyClaimId: dto.WarrantyClaimId,
                    expectedReturnDate: dto.ExpectedReturnDate,
                    conditionAtLoan: dto.ConditionAtLoan,
                    notes: dto.Notes);
                db.LoanerDevices.Add(l);
                await db.SaveChangesAsync();
                return Results.Created($"/api/warranty/loaner-devices/{l.Id}", l);
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { Error = ex.Message }); }
        }).WithValidation<CreateLoanerDeviceDto>();

        group.MapPost("/{id:guid}/return", async (Guid id, [FromBody] ReturnLoanerDto dto, WarrantyDbContext db) =>
        {
            var l = await db.LoanerDevices.FindAsync(id);
            if (l == null) return Results.NotFound();
            try { l.MarkReturned(dto.ConditionAtReturn, dto.Notes); await db.SaveChangesAsync(); return Results.Ok(l); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
        });

        group.MapPost("/{id:guid}/lost", async (Guid id, [FromBody] LoanerNoteDto dto, WarrantyDbContext db) =>
        {
            var l = await db.LoanerDevices.FindAsync(id);
            if (l == null) return Results.NotFound();
            try { l.MarkLost(dto.Notes); await db.SaveChangesAsync(); return Results.Ok(l); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
        });

        group.MapGet("/overdue", async (WarrantyDbContext db) =>
        {
            var now = DateTime.UtcNow;
            var list = await db.LoanerDevices
                .Where(l => l.Status == LoanerStatus.Loaned && l.ExpectedReturnDate < now)
                .OrderBy(l => l.ExpectedReturnDate)
                .ToListAsync();
            return Results.Ok(list);
        });
    }
}

public record CreateLoanerDeviceDto(
    Guid SerialNumberId,
    string SerialNumber,
    Guid CustomerId,
    Guid WarrantyClaimId,
    DateTime ExpectedReturnDate,
    string ConditionAtLoan,
    string? Notes);

public record ReturnLoanerDto(string ConditionAtReturn, string? Notes);
public record LoanerNoteDto(string? Notes);
