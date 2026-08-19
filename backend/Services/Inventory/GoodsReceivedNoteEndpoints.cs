using BuildingBlocks.Security;
using BuildingBlocks.Validation;
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
        var group = app.MapGroup("/api/inventory/grn").RequireAuthorization(policy => policy.RequireRole(Roles.Admin, Roles.Manager, Roles.InventoryStaff));

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
        }).WithValidation<CreateGRNDto>();

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

        // POST /api/inventory/grn/{id}/items/{itemId}/inspect — ghi kết quả kiểm hàng cho 1 dòng
        group.MapPost("{id:guid}/items/{itemId:guid}/inspect", async (Guid id, Guid itemId, InspectItemDto dto, InventoryDbContext db) =>
        {
            var grn = await db.GoodsReceivedNotes.Include(g => g.Items).FirstOrDefaultAsync(g => g.Id == id);
            if (grn == null) return Results.NotFound();
            if (grn.Status != GRNStatus.Draft)
                return Results.BadRequest(new { error = "Only Draft GRNs can be inspected" });

            var item = grn.Items.FirstOrDefault(i => i.Id == itemId);
            if (item == null) return Results.NotFound(new { error = "GRN item not found" });

            try
            {
                item.Inspect(dto.AcceptedQty, dto.RejectedQty, dto.Reason, dto.TargetWarehouseId);
                await db.SaveChangesAsync();
                return Results.Ok(item);
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        // POST /api/inventory/grn/{id}/confirm — confirm and update stock
        // Nếu tất cả dòng đã được Inspect: hàng đạt vào kho chỉ định, hàng lỗi sinh PurchaseReturn tự động.
        // Nếu chưa Inspect: coi toàn bộ Quantity là hàng đạt (giữ tương thích khi bỏ qua bước kiểm).
        group.MapPost("{id:guid}/confirm", async (Guid id, InventoryDbContext db) =>
        {
            var grn = await db.GoodsReceivedNotes.Include(g => g.Items).FirstOrDefaultAsync(g => g.Id == id);
            if (grn == null) return Results.NotFound();
            if (grn.Status != GRNStatus.Draft)
                return Results.BadRequest(new { error = "Only Draft GRNs can be confirmed" });

            grn.Status = GRNStatus.Confirmed;

            var returnItems = new List<PurchaseReturnItem>();

            foreach (var item in grn.Items)
            {
                var acceptedQty = (item.AcceptedQty + item.RejectedQty > 0) ? item.AcceptedQty : item.Quantity;
                var targetWarehouse = item.TargetWarehouseId ?? grn.WarehouseId;

                // 1. Hàng đạt → nhập kho chỉ định
                if (acceptedQty > 0)
                {
                    var invItem = await db.InventoryItems.FirstOrDefaultAsync(i =>
                        i.ProductId == item.ProductId && i.WarehouseId == targetWarehouse);
                    if (invItem != null)
                        invItem.AdjustStock(acceptedQty, $"GRN: {grn.DocumentNumber}");
                    else
                    {
                        var newItem = new InventoryItem(item.ProductId, acceptedQty,
                            warehouseId: targetWarehouse);
                        db.InventoryItems.Add(newItem);
                        invItem = newItem;
                    }

                    db.StockMovements.Add(new StockMovement(
                        invItem.Id, item.ProductId, MovementType.In, acceptedQty,
                        $"Nhập hàng theo phiếu {grn.DocumentNumber}",
                        grn.Id.ToString(), "GRN"));
                }

                // 2. Hàng lỗi → gom vào PurchaseReturn + nhập kho Defective
                if (item.RejectedQty > 0)
                {
                    var defective = await db.Warehouses.FirstOrDefaultAsync(w =>
                        w.Type == WarehouseType.Defective && w.IsActive);

                    if (defective != null)
                    {
                        var defInv = await db.InventoryItems.FirstOrDefaultAsync(i =>
                            i.ProductId == item.ProductId && i.WarehouseId == defective.Id);
                        if (defInv != null)
                            defInv.AdjustStock(item.RejectedQty, $"GRN lỗi: {grn.DocumentNumber} — {item.RejectReason}");
                        else
                        {
                            var newDef = new InventoryItem(item.ProductId, item.RejectedQty,
                                warehouseId: defective.Id);
                            db.InventoryItems.Add(newDef);
                        }
                    }

                    returnItems.Add(new PurchaseReturnItem(
                        item.ProductId, item.ProductName, item.RejectedQty, item.UnitCost,
                        item.RejectReason, item.SerialNumbers));
                }
            }

            Guid? autoReturnId = null;
            if (returnItems.Count > 0 && grn.SupplierId.HasValue)
            {
                var poId = grn.PurchaseOrderId;
                var autoReturn = new PurchaseReturn(
                    grn.SupplierId.Value, returnItems, grn.Id, poId,
                    $"Tự sinh từ GRN {grn.DocumentNumber}");
                db.PurchaseReturns.Add(autoReturn);
                autoReturnId = autoReturn.Id;
            }

            await db.SaveChangesAsync();
            return Results.Ok(new
            {
                success = true,
                documentNumber = grn.DocumentNumber,
                purchaseReturnId = autoReturnId,
                hasRejected = grn.HasRejectedItems
            });
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

public record InspectItemDto(int AcceptedQty, int RejectedQty, string? Reason, Guid? TargetWarehouseId);
