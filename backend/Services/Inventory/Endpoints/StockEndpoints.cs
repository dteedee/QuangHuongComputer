using System.Security.Claims;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using InventoryModule.Application.Stock;
using InventoryModule.Domain;
using InventoryModule.DTOs;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// Tồn kho: tra cứu, giữ chỗ, điều chỉnh nhanh, tồn đầu kỳ (W2-5).
/// Mọi thay đổi số lượng ở đây đều đi qua <see cref="IStockLedger"/> — không endpoint nào tự
/// <c>AdjustStock</c> rồi <c>SaveChanges</c> nữa.
/// </summary>
public sealed class StockEndpoints : IInventorySubmodule
{
    /// <summary>D09 — kho bán được, mảng tĩnh để EF dịch thành <c>= ANY(...)</c>.</summary>
    private static readonly WarehouseType[] Sellable = SellableWarehouseTypes.All.ToArray();

    public int Order => 10;

    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory").RequireModulePermissions(PermissionModules.Inventory);

        MapQueries(group, app);
    }

    private static void MapQueries(RouteGroupBuilder group, IEndpointRouteBuilder app)
    {
        // GET /api/inventory/stock — danh sách tồn, phân trang + lọc theo kho/sản phẩm/tồn thấp.
        group.MapGet("/stock", async (
            [AsParameters] PagedRequest request,
            Guid? warehouseId, Guid? productId, bool? lowStockOnly,
            InventoryDbContext db, CancellationToken ct) =>
        {
            var query = db.InventoryItems.AsQueryable();
            if (warehouseId.HasValue) query = query.Where(i => i.WarehouseId == warehouseId.Value);
            if (productId.HasValue) query = query.Where(i => i.ProductId == productId.Value);
            if (lowStockOnly == true) query = query.Where(i => i.QuantityOnHand <= i.LowStockThreshold);

            var sortable = new Dictionary<string, System.Linq.Expressions.Expression<Func<InventoryItem, object?>>>
            {
                ["quantityOnHand"] = i => i.QuantityOnHand,
                ["averageCost"] = i => i.AverageCost,
                ["lastStockUpdate"] = i => i.LastStockUpdate
            };

            return Results.Ok(await query
                .ApplySort(request, sortable, i => i.Id)
                .ToPagedResultAsync(request, ct));
        })
        .RequireAuthorization(Permissions.Inventory.ViewStock);

        // GET /api/inventory/stock/{productId} — mọi dòng tồn của một sản phẩm (mọi kho, mọi biến thể).
        group.MapGet("/stock/{productId:guid}", async (Guid productId, InventoryDbContext db, CancellationToken ct) =>
        {
            var rows = await db.InventoryItems.Where(i => i.ProductId == productId).ToListAsync(ct);
            return rows.Count == 0 ? Results.NotFound(new { error = "Sản phẩm chưa có tồn kho." }) : Results.Ok(rows);
        })
        .RequireAuthorization(Permissions.Inventory.ViewStock);

        // ---- Tồn công khai cho storefront (khách chưa đăng nhập) ----

        app.MapGet("/api/inventory/products/{productId:guid}/stock", async (
            Guid productId, InventoryDbContext db, CancellationToken ct) =>
        {
            var totals = await SellableTotalsAsync(db, productId, null, ct);
            return Results.Ok(new
            {
                productId,
                quantityOnHand = totals.OnHand,
                reservedQuantity = totals.Reserved,
                availableQuantity = totals.OnHand - totals.Reserved
            });
        }).AllowAnonymous();

        app.MapGet("/api/inventory/products/{productId:guid}/variants/{variantId:guid}/stock", async (
            Guid productId, Guid variantId, InventoryDbContext db, CancellationToken ct) =>
        {
            var totals = await SellableTotalsAsync(db, productId, variantId, ct);
            return Results.Ok(new
            {
                productId,
                variantId,
                quantityOnHand = totals.OnHand,
                reservedQuantity = totals.Reserved,
                availableQuantity = totals.OnHand - totals.Reserved
            });
        }).AllowAnonymous();

        // Tồn theo chi nhánh — chỉ kho khách có thể tới mua/xem (Branch, Showroom).
        app.MapGet("/api/inventory/products/{productId:guid}/stock-by-branch", async (
            Guid productId, InventoryDbContext db, CancellationToken ct) =>
        {
            var rows = await db.InventoryItems
                .Where(i => i.ProductId == productId && i.WarehouseId != null)
                .Join(db.Warehouses.Where(w => w.IsActive &&
                        (w.Type == WarehouseType.Branch || w.Type == WarehouseType.Showroom)),
                    i => i.WarehouseId, w => w.Id,
                    (i, w) => new
                    {
                        warehouseId = w.Id,
                        warehouseName = w.Name,
                        warehouseCode = w.Code,
                        address = w.Address,
                        city = w.City,
                        phone = w.Phone,
                        type = w.Type,
                        quantity = i.QuantityOnHand - i.ReservedQuantity
                    })
                .ToListAsync(ct);

            var result = rows
                .GroupBy(r => new { r.warehouseId, r.warehouseName, r.warehouseCode, r.address, r.city, r.phone, r.type })
                .Select(g => new
                {
                    g.Key.warehouseId,
                    g.Key.warehouseName,
                    g.Key.warehouseCode,
                    g.Key.address,
                    g.Key.city,
                    g.Key.phone,
                    type = g.Key.type.ToString(),
                    quantity = g.Sum(x => x.quantity)
                })
                .Where(x => x.quantity > 0)
                .OrderByDescending(x => x.quantity)
                .ToList();

            return Results.Ok(result);
        }).AllowAnonymous();
    }

    /// <summary>Đọc (sản phẩm, biến thể, kho) của một dòng tồn — sổ cái làm việc theo địa chỉ, không theo id dòng.</summary>
    internal static async Task<StockLocation> LocationOfAsync(InventoryDbContext db, Guid inventoryItemId, CancellationToken ct)
    {
        var row = await db.InventoryItems
            .Where(i => i.Id == inventoryItemId)
            .Select(i => new { i.ProductId, i.VariantId, i.WarehouseId })
            .FirstOrDefaultAsync(ct);

        if (row is null) throw NotFoundException.For("dòng tồn kho", inventoryItemId);
        return new StockLocation(row.ProductId, row.VariantId, row.WarehouseId);
    }

    /// <summary>D09: tồn công bố chỉ cộng kho bán được — hàng ở kho lỗi không bao giờ hiện "còn hàng".</summary>
    private static async Task<(int OnHand, int Reserved)> SellableTotalsAsync(
        InventoryDbContext db, Guid productId, Guid? variantId, CancellationToken ct)
    {
        var query = db.InventoryItems.Where(i => i.ProductId == productId);
        if (variantId.HasValue) query = query.Where(i => i.VariantId == variantId.Value);

        var rows = await query
            .Join(db.Warehouses.Where(w => Sellable.Contains(w.Type)),
                i => i.WarehouseId, w => w.Id,
                (i, _) => new { i.QuantityOnHand, i.ReservedQuantity })
            .ToListAsync(ct);

        return (rows.Sum(r => r.QuantityOnHand), rows.Sum(r => r.ReservedQuantity));
    }
}
