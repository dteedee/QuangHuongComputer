using BuildingBlocks.Paging;
using BuildingBlocks.Security;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// Sổ nhật ký tồn kho — chỉ đọc (W2-5). Sau W2-5 đây là bản ghi ĐẦY ĐỦ: mỗi thay đổi số lượng
/// đều có một dòng kèm người thực hiện, mã lý do, giá vốn và tồn sau bút toán.
/// </summary>
public sealed class StockMovementEndpoints : IInventorySubmodule
{
    public int Order => 70;

    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory/movements")
            .RequireModulePermissions(PermissionModules.Inventory);

        group.MapGet("", async (
            [AsParameters] PagedRequest request,
            Guid? productId, Guid? inventoryItemId, Guid? warehouseId,
            string? type, string? reason, DateTime? from, DateTime? to,
            InventoryDbContext db, CancellationToken ct) =>
        {
            var query = db.StockMovements.AsQueryable();
            if (productId.HasValue) query = query.Where(m => m.ProductId == productId.Value);
            if (inventoryItemId.HasValue) query = query.Where(m => m.InventoryItemId == inventoryItemId.Value);
            if (warehouseId.HasValue) query = query.Where(m => m.WarehouseId == warehouseId.Value);
            if (!string.IsNullOrEmpty(type) && Enum.TryParse<MovementType>(type, true, out var mt))
                query = query.Where(m => m.Type == mt);
            if (!string.IsNullOrEmpty(reason) && Enum.TryParse<StockMovementReason>(reason, true, out var rc))
                query = query.Where(m => m.ReasonCode == rc);
            if (from.HasValue) query = query.Where(m => m.MovementDate >= from.Value);
            if (to.HasValue) query = query.Where(m => m.MovementDate <= to.Value);

            return Results.Ok(await query
                .OrderByDescending(m => m.MovementDate)
                .Select(m => new
                {
                    m.Id,
                    m.InventoryItemId,
                    m.ProductId,
                    m.VariantId,
                    m.WarehouseId,
                    Type = m.Type.ToString(),
                    ReasonCode = m.ReasonCode.ToString(),
                    m.Reason,
                    m.Quantity,
                    m.BalanceAfter,
                    m.UnitCost,
                    m.ReferenceId,
                    m.ReferenceType,
                    m.DocumentReference,
                    m.PerformedBy,
                    m.MovementDate,
                    m.Notes
                })
                .ToPagedResultAsync(request, ct));
        })
        .RequireAuthorization(Permissions.Inventory.ViewStock);
    }
}
