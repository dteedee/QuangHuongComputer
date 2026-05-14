using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Infrastructure;
using InventoryModule.Domain;

namespace InventoryModule;

public static class DeliveryNoteEndpoints
{
    public static void MapDeliveryNoteEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/dn").RequireAuthorization();

        // POST /api/inventory/dn — create DN
        group.MapPost("", async (CreateDNDto dto, InventoryDbContext db) =>
        {
            var dn = new DeliveryNote
            {
                DocumentNumber = DocumentNumberGenerator.GenerateDN(),
                DocumentDate = dto.DocumentDate ?? DateTime.UtcNow,
                WarehouseId = dto.WarehouseId,
                OrderId = dto.OrderId,
                DeliveredBy = dto.DeliveredBy,
                Reason = dto.Reason,
                Notes = dto.Notes,
                Status = DNStatus.Draft,
                Items = dto.Items.Select(i => new DNItem
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    Quantity = i.Quantity,
                    SerialNumbers = i.SerialNumbers
                }).ToList()
            };

            db.DeliveryNotes.Add(dn);
            await db.SaveChangesAsync();
            return Results.Created($"/api/inventory/dn/{dn.Id}", dn);
        });

        // GET /api/inventory/dn — list with pagination
        group.MapGet("", async (int page, int pageSize, InventoryDbContext db) =>
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);
            var total = await db.DeliveryNotes.CountAsync();
            var items = await db.DeliveryNotes
                .OrderByDescending(d => d.DocumentDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            return Results.Ok(new { items, total, page, pageSize });
        });

        // GET /api/inventory/dn/{id} — detail with items
        group.MapGet("{id:guid}", async (Guid id, InventoryDbContext db) =>
        {
            var dn = await db.DeliveryNotes
                .Include(d => d.Items)
                .FirstOrDefaultAsync(d => d.Id == id);
            return dn != null ? Results.Ok(dn) : Results.NotFound();
        });

        // POST /api/inventory/dn/{id}/confirm — confirm and deduct stock
        group.MapPost("{id:guid}/confirm", async (Guid id, InventoryDbContext db) =>
        {
            var dn = await db.DeliveryNotes.Include(d => d.Items).FirstOrDefaultAsync(d => d.Id == id);
            if (dn == null) return Results.NotFound();
            if (dn.Status != DNStatus.Draft)
                return Results.BadRequest(new { error = "Only Draft DNs can be confirmed" });

            foreach (var item in dn.Items)
            {
                var invItem = await db.InventoryItems.FirstOrDefaultAsync(i => i.ProductId == item.ProductId);
                if (invItem == null)
                    return Results.BadRequest(new { error = $"Product {item.ProductId} not found in inventory" });
                if (invItem.AvailableQuantity < item.Quantity)
                    return Results.BadRequest(new { error = $"Insufficient stock for product {item.ProductName}" });

                invItem.AdjustStock(-item.Quantity, $"DN: {dn.DocumentNumber}");

                db.StockMovements.Add(new StockMovement(
                    invItem.Id,
                    item.ProductId,
                    MovementType.Out,
                    -item.Quantity,
                    $"Xuất hàng theo phiếu {dn.DocumentNumber}",
                    dn.Id.ToString(),
                    "DN"
                ));
            }

            dn.Status = DNStatus.Confirmed;
            await db.SaveChangesAsync();
            return Results.Ok(new { success = true, documentNumber = dn.DocumentNumber });
        });

        // POST /api/inventory/dn/{id}/cancel
        group.MapPost("{id:guid}/cancel", async (Guid id, InventoryDbContext db) =>
        {
            var dn = await db.DeliveryNotes.FirstOrDefaultAsync(d => d.Id == id);
            if (dn == null) return Results.NotFound();
            if (dn.Status == DNStatus.Confirmed)
                return Results.BadRequest(new { error = "Cannot cancel a confirmed DN" });

            dn.Status = DNStatus.Cancelled;
            await db.SaveChangesAsync();
            return Results.Ok(new { success = true });
        });
    }
}

public record CreateDNDto(
    Guid? WarehouseId,
    Guid? OrderId,
    string DeliveredBy,
    DNReason Reason,
    DateTime? DocumentDate,
    string? Notes,
    List<CreateDNItemDto> Items
);
public record CreateDNItemDto(Guid ProductId, string ProductName, int Quantity, string? SerialNumbers);
