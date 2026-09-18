using BuildingBlocks.Security;
using System.Text.Json;
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
///
/// W0-11: GET returned the raw WarrantyRma entity - itemsJson (a JSON string,
/// not items[]) and no code field - which crashed the RMA page the moment one
/// RMA existed (frontend/src/pages/backoffice/warranty/warranty-rma-page.tsx
/// reads r.code and r.items.length). Every response now goes through RmaDto,
/// matching frontend/src/api/warranty.ts's WarrantyRma/CreateRmaRequest shape.
/// </summary>
public static class WarrantyRmaEndpoints
{
    private static readonly JsonSerializerOptions ItemsJsonOptions = new(JsonSerializerDefaults.Web);

    public static void MapWarrantyRmaEndpoints(this IEndpointRouteBuilder app)
    {
        // W1-10: quy trình RMA -> quyền theo verb của module Warranty.
        var group = app.MapGroup("/api/warranty/rma")
            .RequireModulePermissions(PermissionModules.Warranty);

        group.MapGet("/", async (WarrantyDbContext db, [FromQuery] string? status = null) =>
        {
            var q = db.Rmas.AsQueryable();
            if (!string.IsNullOrEmpty(status) && Enum.TryParse<RmaStatus>(status, true, out var s))
                q = q.Where(r => r.Status == s);
            var rmas = await q.OrderByDescending(r => r.SentDate).ToListAsync();
            return Results.Ok(rmas.Select(ToDto));
        });

        group.MapGet("/{id:guid}", async (Guid id, WarrantyDbContext db) =>
        {
            var rma = await db.Rmas.FindAsync(id);
            return rma == null ? Results.NotFound() : Results.Ok(ToDto(rma));
        });

        group.MapPost("/", async ([FromBody] CreateRmaDto dto, WarrantyDbContext db) =>
        {
            var itemsJson = JsonSerializer.Serialize(dto.Items ?? new List<RmaItemDto>(), ItemsJsonOptions);
            var rma = new WarrantyRma(
                supplierId: dto.SupplierId,
                rmaNumber: dto.RmaNumber ?? $"RMA-{DateTime.UtcNow:yyyyMMdd-HHmmss}",
                itemsJson: itemsJson,
                expectedReturnDate: dto.ExpectedReturnDate,
                externalRmaCode: dto.ExternalRmaCode,
                notes: dto.Notes);
            db.Rmas.Add(rma);
            await db.SaveChangesAsync();
            return Results.Created($"/api/warranty/rma/{rma.Id}", new { rma.Id, Code = rma.RmaNumber, rma.Status });
        });

        group.MapPost("/{id:guid}/send", async (Guid id, [FromBody] SendRmaDto dto, WarrantyDbContext db) =>
        {
            var rma = await db.Rmas.FindAsync(id);
            if (rma == null) return Results.NotFound();
            try { rma.MarkSent(dto.ExternalRmaCode); await db.SaveChangesAsync(); return Results.Ok(ToDto(rma)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
        });

        group.MapPost("/{id:guid}/receive", async (Guid id, [FromBody] ReceiveRmaDto dto, WarrantyDbContext db) =>
        {
            var rma = await db.Rmas.FindAsync(id);
            if (rma == null) return Results.NotFound();
            try { rma.MarkReceived(dto.Result, dto.Notes); await db.SaveChangesAsync(); return Results.Ok(ToDto(rma)); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ex.Message }); }
        });

        group.MapPost("/{id:guid}/close", async (Guid id, WarrantyDbContext db) =>
        {
            var rma = await db.Rmas.FindAsync(id);
            if (rma == null) return Results.NotFound();
            try { rma.Close(); await db.SaveChangesAsync(); return Results.Ok(ToDto(rma)); }
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
            return Results.Ok(rmas.Select(ToDto));
        });
    }

    /// <summary>Entity -> wire DTO. Never return WarrantyRma directly (see class doc).</summary>
    private static RmaDto ToDto(WarrantyRma rma) => new(
        rma.Id,
        rma.RmaNumber,
        rma.SupplierId,
        rma.ExternalRmaCode,
        rma.Status,
        rma.Result,
        rma.SentDate,
        rma.ExpectedReturnDate,
        rma.ActualReturnDate,
        rma.Notes,
        rma.IsOverdue(),
        ParseItems(rma.ItemsJson),
        rma.CreatedAt);

    /// <summary>Never throws - malformed/empty ItemsJson (pre-fix rows, hand
    /// edits) degrades to an empty list rather than a 500.</summary>
    private static List<RmaItemDto> ParseItems(string? itemsJson)
    {
        if (string.IsNullOrWhiteSpace(itemsJson)) return new List<RmaItemDto>();
        try
        {
            return JsonSerializer.Deserialize<List<RmaItemDto>>(itemsJson, ItemsJsonOptions) ?? new List<RmaItemDto>();
        }
        catch (JsonException)
        {
            return new List<RmaItemDto>();
        }
    }
}

public record CreateRmaDto(
    Guid SupplierId,
    List<RmaItemDto>? Items,
    string? RmaNumber,
    DateTime? ExpectedReturnDate,
    string? ExternalRmaCode,
    string? Notes);

public record SendRmaDto(string? ExternalRmaCode);
public record ReceiveRmaDto(string Result, string? Notes);

/// <summary>One serial + its issue inside an RMA. Matches
/// frontend/src/api/warranty.ts RmaItem.</summary>
public record RmaItemDto(
    string? Id,
    string SerialNumber,
    string? ProductName,
    string Issue,
    string? WarrantyClaimId);

/// <summary>Wire shape for a WarrantyRma. Matches
/// frontend/src/api/warranty.ts WarrantyRma (SupplierName omitted - Warranty
/// does not import Inventory.Domain to resolve it; the page already falls
/// back to the supplier id when absent).</summary>
public record RmaDto(
    Guid Id,
    string Code,
    Guid SupplierId,
    string? ExternalRmaCode,
    RmaStatus Status,
    string? Result,
    DateTime SentDate,
    DateTime? ExpectedReturnDate,
    DateTime? ActualReturnDate,
    string? Notes,
    bool IsOverdue,
    List<RmaItemDto> Items,
    DateTime CreatedAt);
