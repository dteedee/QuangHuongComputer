using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Infrastructure;
using InventoryModule.Domain;

namespace InventoryModule;

public static class InventoryCountEndpoints
{
    public static void MapInventoryCountEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/count").RequireAuthorization(policy => policy.RequireRole("Admin", "Manager", "InventoryStaff"));

        // POST /api/inventory/count — create session, populate items from current inventory
        group.MapPost("", async (CreateCountSessionDto dto, InventoryDbContext db) =>
        {
            var query = db.InventoryItems.AsQueryable();
            if (dto.WarehouseId.HasValue)
                query = query.Where(i => i.WarehouseId == dto.WarehouseId);

            var inventoryItems = await query.ToListAsync();

            var session = new InventoryCountSession
            {
                DocumentNumber = DocumentNumberGenerator.GenerateCount(),
                CountDate = dto.CountDate ?? DateTime.UtcNow,
                WarehouseId = dto.WarehouseId,
                Scope = dto.Scope,
                CategoryId = dto.CategoryId,
                Notes = dto.Notes,
                Status = CountSessionStatus.Open,
                Items = inventoryItems.Select(i => new InventoryCountItem
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductId.ToString(), // Product name resolved from catalog
                    SystemQuantity = i.QuantityOnHand,
                    CountedQuantity = null
                }).ToList()
            };

            db.InventoryCountSessions.Add(session);
            await db.SaveChangesAsync();
            return Results.Created($"/api/inventory/count/{session.Id}", session);
        });

        // GET /api/inventory/count — list sessions
        group.MapGet("", async (int page, int pageSize, InventoryDbContext db) =>
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);
            var total = await db.InventoryCountSessions.CountAsync();
            var items = await db.InventoryCountSessions
                .OrderByDescending(s => s.CountDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            return Results.Ok(new { items, total, page, pageSize });
        });

        // GET /api/inventory/count/{id} — session with items + variance
        group.MapGet("{id:guid}", async (Guid id, InventoryDbContext db) =>
        {
            var session = await db.InventoryCountSessions
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == id);
            if (session == null) return Results.NotFound();

            var result = new
            {
                session.Id,
                session.DocumentNumber,
                session.CountDate,
                session.WarehouseId,
                session.Scope,
                session.Status,
                session.Notes,
                Items = session.Items.Select(i => new
                {
                    i.Id,
                    i.ProductId,
                    i.ProductName,
                    i.SystemQuantity,
                    i.CountedQuantity,
                    i.Variance,
                    i.CountedBy,
                    i.Notes
                }),
                TotalVariance = session.Items.Sum(i => i.Variance)
            };
            return Results.Ok(result);
        });

        // POST /api/inventory/count/{id}/record — submit counted qty for items
        group.MapPost("{id:guid}/record", async (Guid id, List<RecordCountItemDto> items, InventoryDbContext db) =>
        {
            var session = await db.InventoryCountSessions
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == id);
            if (session == null) return Results.NotFound();
            if (session.Status == CountSessionStatus.Approved || session.Status == CountSessionStatus.Cancelled)
                return Results.BadRequest(new { error = "Cannot record counts for this session" });

            foreach (var dto in items)
            {
                var item = session.Items.FirstOrDefault(i => i.Id == dto.ItemId);
                if (item == null) continue;
                item.CountedQuantity = dto.CountedQuantity;
                item.CountedBy = dto.CountedBy;
                item.Notes = dto.Notes;
            }

            session.Status = CountSessionStatus.InProgress;
            await db.SaveChangesAsync();
            return Results.Ok(new { success = true, recordedCount = items.Count });
        });

        // POST /api/inventory/count/{id}/approve — create adjustments, update quantities
        group.MapPost("{id:guid}/approve", async (Guid id, ApproveCountDto dto, InventoryDbContext db) =>
        {
            var session = await db.InventoryCountSessions
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == id);
            if (session == null) return Results.NotFound();
            if (session.Status != CountSessionStatus.InProgress && session.Status != CountSessionStatus.PendingApproval)
                return Results.BadRequest(new { error = "Session must be InProgress or PendingApproval to approve" });

            foreach (var item in session.Items.Where(i => i.CountedQuantity.HasValue && i.Variance != 0))
            {
                var invItem = await db.InventoryItems.FirstOrDefaultAsync(i => i.ProductId == item.ProductId);
                if (invItem == null) continue;

                invItem.AdjustStock(item.Variance, $"Kiểm kê: {session.DocumentNumber}");

                db.StockMovements.Add(new StockMovement(
                    invItem.Id,
                    item.ProductId,
                    MovementType.Adjustment,
                    item.Variance,
                    $"Điều chỉnh sau kiểm kê {session.DocumentNumber}",
                    session.Id.ToString(),
                    "InventoryCount"
                ));
            }

            session.Status = CountSessionStatus.Approved;
            session.ApprovedBy = dto.ApprovedBy;
            session.ApprovedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(new { success = true, documentNumber = session.DocumentNumber });
        });

        // POST /api/inventory/count/{id}/cancel
        group.MapPost("{id:guid}/cancel", async (Guid id, InventoryDbContext db) =>
        {
            var session = await db.InventoryCountSessions.FirstOrDefaultAsync(s => s.Id == id);
            if (session == null) return Results.NotFound();
            if (session.Status == CountSessionStatus.Approved)
                return Results.BadRequest(new { error = "Cannot cancel an approved count session" });

            session.Status = CountSessionStatus.Cancelled;
            await db.SaveChangesAsync();
            return Results.Ok(new { success = true });
        });
    }
}

public record CreateCountSessionDto(
    Guid? WarehouseId,
    CountScope Scope,
    Guid? CategoryId,
    DateTime? CountDate,
    string? Notes
);
public record RecordCountItemDto(Guid ItemId, int CountedQuantity, string? CountedBy, string? Notes);
public record ApproveCountDto(string ApprovedBy);
