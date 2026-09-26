using System.Security.Claims;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Pricing.Bundles;
using Sales.Infrastructure;

namespace Sales.Endpoints.Carts;

/// <summary>
/// Combo trong giỏ của tài khoản:
///  · POST   /cart/bundles                       — thêm N bộ combo (một nhóm dòng mang BundleId);
///  · DELETE /cart/bundles/{bundleId}            — gỡ trọn nhóm;
///  · PUT    /cart/bundles/{bundleId}/items/{productId} — đổi số lượng một món ⇒ combo VỠ, về giá lẻ;
///  · DELETE /cart/bundles/{bundleId}/items/{productId} — bỏ một món ⇒ combo VỠ, món còn lại về giá lẻ.
/// Giá combo không bao giờ lấy từ client; GET /cart và chốt đơn tính lại qua BundleCartPricingService.
/// </summary>
internal static class CartBundleEndpoints
{
    private const int MaxQuantityPerCartLine = 99;

    public static void MapCartBundleEndpoints(RouteGroupBuilder group)
    {
        group.MapPost("/cart/bundles", async ([FromBody] AddBundleToCartDto dto, SalesDbContext db,
            CatalogDbContext catalogDb, InventoryDbContext inventoryDb, ClaimsPrincipal user, CancellationToken ct) =>
        {
            if (!TryUserId(user, out var userId)) return Results.Unauthorized();

            var cart = await Sales.Endpoints.Checkout.CheckoutCartResolver.ForCustomerAsync(db, userId, ct);
            var (bundle, error) = await BundleCartComponentsLoader.LoadAsync(
                catalogDb, inventoryDb, dto.BundleId, dto.Quantity, cart, ct);
            if (bundle == null) return Results.BadRequest(new { Error = error });

            cart.AddBundle(bundle.BundleId, bundle.Name, bundle.Components, dto.Quantity);
            if (cart.Items.Any(i => i.Quantity > MaxQuantityPerCartLine))
                return Results.BadRequest(new { Error = $"Số lượng tối đa mỗi sản phẩm là {MaxQuantityPerCartLine}" });

            await db.SaveChangesAsync(ct);
            return Results.Ok(new { Message = $"Đã thêm {bundle.Name} vào giỏ hàng", bundle.BundleId });
        });

        group.MapDelete("/cart/bundles/{bundleId:guid}", async (Guid bundleId, SalesDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var cart = await LoadCartAsync(db, user, ct);
            if (cart == null) return Results.NotFound(new { Error = "Cart not found" });

            cart.RemoveBundle(bundleId);
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { Message = "Đã gỡ combo khỏi giỏ hàng" });
        });

        group.MapPut("/cart/bundles/{bundleId:guid}/items/{productId:guid}", async (Guid bundleId, Guid productId,
            [FromBody] UpdateQuantityDto dto, SalesDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            if (dto.Quantity is < 0 or > MaxQuantityPerCartLine)
                return Results.BadRequest(new { Error = $"Số lượng từ 0 đến {MaxQuantityPerCartLine}" });

            var cart = await LoadCartAsync(db, user, ct);
            if (cart == null) return Results.NotFound(new { Error = "Cart not found" });

            cart.UpdateBundleItemQuantity(bundleId, productId, dto.Quantity);
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { Message = "Combo đã tách, giá các món trở về giá lẻ" });
        });

        group.MapDelete("/cart/bundles/{bundleId:guid}/items/{productId:guid}", async (Guid bundleId, Guid productId,
            SalesDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var cart = await LoadCartAsync(db, user, ct);
            if (cart == null) return Results.NotFound(new { Error = "Cart not found" });

            cart.RemoveBundleItem(bundleId, productId);
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { Message = "Combo đã tách, giá các món còn lại trở về giá lẻ" });
        });
    }

    private static async Task<Sales.Domain.Cart?> LoadCartAsync(SalesDbContext db, ClaimsPrincipal user, CancellationToken ct)
    {
        if (!TryUserId(user, out var userId)) return null;
        return await db.Carts.Include(c => c.Items).FirstOrDefaultAsync(c => c.CustomerId == userId, ct);
    }

    private static bool TryUserId(ClaimsPrincipal user, out Guid userId)
        => Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
}
