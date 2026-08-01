using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Warranty.Domain;
using Warranty.Infrastructure;

namespace Warranty;

/// <summary>
/// Phase 07: RMA — gửi hàng về hãng/NCC. Admin/Manager/TechnicianInShop quản lý.
/// Không import Inventory.Domain — SupplierId chỉ là Guid.
/// </summary>
public static class WarrantyRmaEndpoints
{
    public static void MapWarrantyRmaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/warranty/rma")
            .RequireAuthorization(p => p.RequireRole("Admin", "Manager", "TechnicianInShop"));

        group.MapGet("/", async (WarrantyDbContext db, [FromQuery] string? status = null) =>
        {
            var q = db.Rmas.AsQueryable();
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<RmaStatus>(status, true, out var s))
                q = q.Where(r => r.Status == s);
            var rmas = await q.OrderByDescending(r => r.SentDate).ToListAsync();
            return Results.Ok(rmas);
        });

        group.MapGet("/{id:guid}", async (Guid id, WarrantyDbContext db) =>
        {
            var rma = await db.Rmas.FindAsync(id);
            return rma == null ? Results.NotFound() : Results.Ok(rma);
        });

        group.MapPost("/", async ([FromBody] CreateRmaDto dto, WarrantyDbContext db) =>
        {
            var rma = new WarrantyRma(
                supplierId: dto.SupplierId,
                rmaNumber: dto.RmaNumber ?? $"RMA-{DateTime.UtcNow:yyyyMMdd-HHmmss}",
                itemsJson: dto.ItemsJson ?? "[]",
                expectedReturnDate: dto.ExpectedReturnDate,
                externalRmaCode: dto.ExternalRmaCode,
                notes: dto.Notes);
            db.Rmas.Add(rma);
            await db.SaveChangesAsync();
            return Results.Created($"/api/warranty/rma/{rma.Id}", rma);
        });

        group.MapPost("/{id:guid}/send", async (Guid id, [FromBody] SendRmaDto dto, WarrantyDbContext db) =>
        {
            var rma = await db.Rmas.FindAsync(id);
            if (rma == null) return Results.NotFound();
            try { rma.MarkSent(dto.ExternalRmaCode); await db.SaveChangesAsync(); return Results.Ok(rma); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
        });

        group.MapPost("/{id:guid}/receive", async (Guid id, [FromBody] ReceiveRmaDto dto, WarrantyDbContext db) =>
        {
            var rma = await db.Rmas.FindAsync(id);
            if (rma == null) return Results.NotFound();
            try { rma.MarkReceived(dto.Result, dto.Notes); await db.SaveChangesAsync(); return Results.Ok(rma); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
        });

        group.MapPost("/{id:guid}/close", async (Guid id, WarrantyDbContext db) =>
        {
            var rma = await db.Rmas.FindAsync(id);
            if (rma == null) return Results.NotFound();
            try { rma.Close(); await db.SaveChangesAsync(); return Results.Ok(rma); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
        });

        // Cảnh báo RMA quá hạn (chưa nhận về).
        group.MapGet("/overdue", async (WarrantyDbContext db) =>
        {
            var now = DateTime.UtcNow;
            var rmas = await db.Rmas
                .Where(r => r.Status == RmaStatus.Sent
                            && r.ExpectedReturnDate != null
                            && r.ActualReturnDate == null
                            && r.ExpectedReturnDate < now)
                .OrderBy(r => r.ExpectedReturnDate)
                .ToListAsync();
            return Results.Ok(rmas);
        });
    }
}

public record CreateRmaDto(
    Guid SupplierId,
    string? RmaNumber,
    string? ItemsJson,
    DateTime? ExpectedReturnDate,
    string? ExternalRmaCode,
    string? Notes);

public record SendRmaDto(string? ExternalRmaCode);
public record ReceiveRmaDto(string Result, string? Notes);
