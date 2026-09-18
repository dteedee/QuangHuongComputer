using System.Security.Claims;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using InventoryModule.Application.Stock;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// Phiếu điều chỉnh tồn kho (W2-5 bước 7). Entity <c>StockAdjustment</c> đã có bảng và index từ
/// lâu nhưng CHƯA TỪNG có endpoint nào — nghĩa là mọi điều chỉnh trước đây đều không có phiếu,
/// không có mã lý do và không có người duyệt.
///
/// <para>
/// Quy trình: lập phiếu (tồn kho chưa đổi) → duyệt bởi người KHÁC → bút toán được ghi qua sổ cái.
/// Không bao giờ cho tồn âm; phiếu không có lý do bị chặn ngay ở constructor của aggregate.
/// </para>
/// </summary>
public sealed class StockAdjustmentEndpoints : IInventorySubmodule
{
    public int Order => 50;

    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/adjustments")
            .RequireModulePermissions(PermissionModules.Inventory);

        group.MapGet("", async (
            [AsParameters] PagedRequest request, Guid? warehouseId, bool? pendingOnly,
            InventoryDbContext db, CancellationToken ct) =>
        {
            var query = db.StockAdjustments.Include(a => a.Items).AsQueryable();
            if (warehouseId.HasValue) query = query.Where(a => a.WarehouseId == warehouseId.Value);
            if (pendingOnly == true) query = query.Where(a => !a.IsApproved);

            return Results.Ok(await query
                .OrderByDescending(a => a.AdjustedAt)
                .Select(a => new
                {
                    a.Id,
                    a.AdjustmentNumber,
                    a.WarehouseId,
                    Type = a.Type.ToString(),
                    a.Reason,
                    a.AdjustedBy,
                    a.AdjustedAt,
                    a.IsApproved,
                    a.ApprovedBy,
                    a.ApprovedAt,
                    a.IsPosted,
                    LineCount = a.Items.Count,
                    TotalDelta = a.Items.Sum(i => i.QuantityAdjusted)
                })
                .ToPagedResultAsync(request, ct));
        })
        .RequireAuthorization(Permissions.Inventory.ViewStock);

        group.MapGet("{id:guid}", async (Guid id, InventoryDbContext db, CancellationToken ct) =>
        {
            var adjustment = await LoadAsync(db, id, ct);
            return Results.Ok(new
            {
                adjustment.Id,
                adjustment.AdjustmentNumber,
                adjustment.WarehouseId,
                Type = adjustment.Type.ToString(),
                ReasonCode = adjustment.ToMovementReason().ToString(),
                adjustment.Reason,
                adjustment.AdjustedBy,
                adjustment.AdjustedAt,
                adjustment.IsApproved,
                adjustment.ApprovedBy,
                adjustment.ApprovedAt,
                adjustment.IsPosted,
                adjustment.PostedAt,
                adjustment.RejectionReason,
                Items = adjustment.Items.Select(i => new
                {
                    i.Id,
                    i.InventoryItemId,
                    i.QuantityBefore,
                    i.QuantityAdjusted,
                    i.QuantityAfter,
                    i.ProductName,
                    i.ProductSku
                })
            });
        })
        .RequireAuthorization(Permissions.Inventory.ViewStock);

        // POST — lập phiếu. Chưa đụng tới tồn kho: tồn chỉ đổi khi phiếu được duyệt.
        group.MapPost("", async (
            CreateStockAdjustmentDto dto, InventoryDbContext db, InventoryDocumentNumbers numbers,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            var ids = dto.Items.Select(i => i.InventoryItemId).ToList();
            var rows = await db.InventoryItems
                .Where(i => ids.Contains(i.Id))
                .Select(i => new { i.Id, i.ProductId, i.WarehouseId, i.QuantityOnHand, i.ReservedQuantity })
                .ToListAsync(ct);

            var lines = new List<StockAdjustmentItem>();
            foreach (var line in dto.Items)
            {
                var row = rows.FirstOrDefault(r => r.Id == line.InventoryItemId)
                          ?? throw NotFoundException.For("dòng tồn kho", line.InventoryItemId);
                if (row.WarehouseId != dto.WarehouseId)
                    throw new DomainException("Mặt hàng được chọn không nằm trong kho của phiếu.");
                if (row.QuantityOnHand + line.QuantityAdjusted < row.ReservedQuantity)
                    throw new DomainException(
                        $"Điều chỉnh {line.QuantityAdjusted} làm tồn thấp hơn phần đang giữ chỗ ({row.ReservedQuantity}).");

                lines.Add(new StockAdjustmentItem(row.Id, row.QuantityOnHand, line.QuantityAdjusted,
                    line.ProductName, line.ProductSku));
            }

            var adjustment = new StockAdjustment(
                await numbers.NextAsync(InventoryDocumentNumbers.StockAdjustment, ct),
                dto.WarehouseId, dto.Type, lines, dto.Reason,
                StockLedgerContext.ResolveActor(user));

            db.StockAdjustments.Add(adjustment);
            await db.SaveChangesAsync(ct);

            return Results.Created($"/api/inventory/adjustments/{adjustment.Id}",
                new { adjustment.Id, adjustment.AdjustmentNumber, lineCount = lines.Count });
        })
        .RequireAuthorization(Permissions.Inventory.AdjustStock)
        .WithValidation<CreateStockAdjustmentDto>();

        // POST /{id}/approve — duyệt + ghi sổ trong một transaction.
        group.MapPost("{id:guid}/approve", async (
            Guid id, InventoryDbContext db, IStockLedger ledger, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var adjustment = await LoadAsync(db, id, ct);
            var approver = StockLedgerContext.ResolveActor(user);

            var posted = await ledger.InTransactionAsync(async token =>
            {
                adjustment.Approve(approver);   // ném khi người lập tự duyệt
                var context = new StockLedgerContext(approver, adjustment.Id.ToString(),
                    "StockAdjustment", adjustment.AdjustmentNumber, adjustment.Reason);

                var count = 0;
                foreach (var line in adjustment.Items)
                {
                    var location = await StockEndpoints.LocationOfAsync(db, line.InventoryItemId, token);
                    await ledger.AdjustAsync(location, line.QuantityAdjusted, context,
                        adjustment.ToMovementReason(), token);
                    count++;
                }

                adjustment.MarkPosted();
                await db.SaveChangesAsync(token);
                return count;
            }, ct);

            return Results.Ok(new
            {
                success = true,
                adjustment.AdjustmentNumber,
                postedLines = posted
            });
        })
        .RequireAuthorization(Permissions.Inventory.Approve);

        group.MapPost("{id:guid}/reject", async (
            Guid id, RejectAdjustmentDto dto, InventoryDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var adjustment = await LoadAsync(db, id, ct);
            adjustment.Reject(StockLedgerContext.ResolveActor(user), dto.Reason);
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { success = true });
        })
        .RequireAuthorization(Permissions.Inventory.Approve)
        .WithValidation<RejectAdjustmentDto>();
    }

    private static async Task<StockAdjustment> LoadAsync(InventoryDbContext db, Guid id, CancellationToken ct)
    {
        var adjustment = await db.StockAdjustments.Include(a => a.Items).FirstOrDefaultAsync(a => a.Id == id, ct);
        return adjustment ?? throw NotFoundException.For("phiếu điều chỉnh", id);
    }
}
