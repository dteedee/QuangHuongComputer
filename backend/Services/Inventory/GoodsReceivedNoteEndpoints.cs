using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Infrastructure;
using InventoryModule.Domain;

namespace InventoryModule;

public static class GoodsReceivedNoteEndpoints
{
    public static void MapGoodsReceivedNoteEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/grn").RequireAuthorization();

        // POST /api/inventory/grn — create GRN
        group.MapPost("", async (CreateGRNDto dto, InventoryDbContext db) =>
        {
            var grn = new GoodsReceivedNote
            {
                DocumentNumber = DocumentNumberGenerator.GenerateGRN(),
                DocumentDate = dto.DocumentDate ?? DateTime.UtcNow,
                SupplierId = dto.SupplierId,
                WarehouseId = dto.WarehouseId,
                PurchaseOrderId = dto.PurchaseOrderId,
                ReceivedBy = dto.ReceivedBy,
                Notes = dto.Notes,
                Status = GRNStatus.Draft,
                Items = dto.Items.Select(i => new GRNItem
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    Quantity = i.Quantity,
                    UnitCost = i.UnitCost,
                    SerialNumbers = i.SerialNumbers
                }).ToList()
            };

            db.GoodsReceivedNotes.Add(grn);
            await db.SaveChangesAsync();
            return Results.Created($"/api/inventory/grn/{grn.Id}", grn);
        });

        // GET /api/inventory/grn — list with pagination
        group.MapGet("", async (int page, int pageSize, InventoryDbContext db) =>
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);
            var total = await db.GoodsReceivedNotes.CountAsync();
            var items = await db.GoodsReceivedNotes
                .OrderByDescending(g => g.DocumentDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            return Results.Ok(new { items, total, page, pageSize });
        });

        // GET /api/inventory/grn/{id} — detail with items
        group.MapGet("{id:guid}", async (Guid id, InventoryDbContext db) =>
        {
            var grn = await db.GoodsReceivedNotes
                .Include(g => g.Items)
                .FirstOrDefaultAsync(g => g.Id == id);
            return grn != null ? Results.Ok(grn) : Results.NotFound();
        });

        // POST /api/inventory/grn/{id}/confirm — confirm and update stock
        group.MapPost("{id:guid}/confirm", async (Guid id, InventoryDbContext db) =>
        {
            var grn = await db.GoodsReceivedNotes.Include(g => g.Items).FirstOrDefaultAsync(g => g.Id == id);
            if (grn == null) return Results.NotFound();
            if (grn.Status != GRNStatus.Draft)
                return Results.BadRequest(new { error = "Only Draft GRNs can be confirmed" });

            grn.Status = GRNStatus.Confirmed;

            foreach (var item in grn.Items)
            {
                var invItem = await db.InventoryItems.FirstOrDefaultAsync(i => i.ProductId == item.ProductId);
                if (invItem != null)
                    invItem.AdjustStock(item.Quantity, $"GRN: {grn.DocumentNumber}");
                else
                    db.InventoryItems.Add(new InventoryItem(item.ProductId, item.Quantity));

                db.StockMovements.Add(new StockMovement(
                    invItem?.Id ?? Guid.NewGuid(),
                    item.ProductId,
                    MovementType.In,
                    item.Quantity,
                    $"Nhập hàng theo phiếu {grn.DocumentNumber}",
                    grn.Id.ToString(),
                    "GRN"
                ));
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { success = true, documentNumber = grn.DocumentNumber });
        });

        // POST /api/inventory/grn/{id}/cancel
        group.MapPost("{id:guid}/cancel", async (Guid id, InventoryDbContext db) =>
        {
            var grn = await db.GoodsReceivedNotes.FirstOrDefaultAsync(g => g.Id == id);
            if (grn == null) return Results.NotFound();
            if (grn.Status == GRNStatus.Confirmed)
                return Results.BadRequest(new { error = "Cannot cancel a confirmed GRN" });

            grn.Status = GRNStatus.Cancelled;
            await db.SaveChangesAsync();
            return Results.Ok(new { success = true });
        });
    }
}

public record CreateGRNDto(
    Guid? SupplierId,
    Guid? WarehouseId,
    Guid? PurchaseOrderId,
    string ReceivedBy,
    DateTime? DocumentDate,
    string? Notes,
    List<CreateGRNItemDto> Items
);
public record CreateGRNItemDto(Guid ProductId, string ProductName, int Quantity, decimal UnitCost, string? SerialNumbers);
