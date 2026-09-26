using System.Security.Claims;
using System.Text.Json;
using BuildingBlocks.Security;
using BuildingBlocks.SharedKernel;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Sales.Domain;
using Sales.Infrastructure;
using Catalog.Infrastructure;
using InventoryModule.Infrastructure;
using Content.Infrastructure;
using Content.Domain;
using Sales.Application.Pricing;
using MassTransit;
using BuildingBlocks.Messaging.IntegrationEvents;

namespace Sales.Endpoints.Carts;

/// <summary>
/// GET /api/sales/cart — đọc giỏ kèm tồn khả dụng và khối vatBreakdown theo dòng (D01 §6).
/// </summary>
internal static class CartQueryEndpoints
{
    public static void MapCartQueryEndpoints(RouteGroupBuilder group)
    {
        // ==================== CART ENDPOINTS ====================

        group.MapGet("/cart", async (SalesDbContext db, CatalogDbContext catalogDb, InventoryDbContext inventoryDb,
            LineVatProfileResolver vatResolver, Sales.Application.Pricing.Bundles.BundleCartPricingService bundlePricing,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            try
            {
                var cart = await db.Carts
                    .Include(c => c.Items)
                    .FirstOrDefaultAsync(c => c.CustomerId == userId);

                if (cart == null)
                {
                    cart = new Cart(userId);
                    db.Carts.Add(cart);
                    await db.SaveChangesAsync();
                }

                var productIds = cart.Items.Select(i => i.ProductId).Distinct().ToList();

                var products = await catalogDb.Products
                    .AsNoTracking()
                    .Where(p => productIds.Contains(p.Id))
                    .Select(p => new { p.Id, p.ImageUrl })
                    .ToDictionaryAsync(p => p.Id, p => p.ImageUrl);

                // W0-4 FIX: TRƯỚC là `.ToDictionaryAsync(i => i.ProductId, ...)` → một sản phẩm
                // nằm ở 2 kho = 2 dòng InventoryItems = duplicate key → ArgumentException →
                // GET /api/sales/cart trả 400, giỏ hàng trông như rỗng, khách không checkout được.
                // Giờ GOM theo (ProductId, VariantId) và CỘNG AvailableQuantity của mọi kho.
                var inventoryRows = await inventoryDb.InventoryItems
                    .AsNoTracking()
                    .Where(i => productIds.Contains(i.ProductId))
                    .Select(i => new { i.ProductId, i.VariantId, i.AvailableQuantity })
                    .ToListAsync();

                var stockByKey = inventoryRows
                    .GroupBy(i => (i.ProductId, i.VariantId))
                    .ToDictionary(g => g.Key, g => g.Sum(x => x.AvailableQuantity));
                // Dự phòng: dòng giỏ không có VariantId nhưng kho lại tách theo biến thể.
                var stockByProduct = inventoryRows
                    .GroupBy(i => i.ProductId)
                    .ToDictionary(g => g.Key, g => g.Sum(x => x.AvailableQuantity));

                // D01 §6 — thuế suất THEO DÒNG (join Categories), không dùng một thuế suất chung.
                var vatProfiles = await vatResolver.ResolveAsync(productIds, ct: ct);
                // Combo: giá combo tính lại mỗi lần đọc giỏ (combo hết hạn/hết hàng ⇒ về giá lẻ ngay).
                var cartLines = cart.Items.ToList();
                var bundles = await bundlePricing.PriceAsync(cartLines, checkStock: true, ct);
                var cartTotals = CartVatBreakdown.Compute(cart, vatProfiles, bundles);

                return Results.Ok(new CartDto(
                    cart.Id,
                    cart.CustomerId,
                    cartTotals.Subtotal,
                    // Tổng giảm = giảm combo (theo dòng) + coupon (chỉ trên dòng không thuộc combo).
                    cartTotals.EffectiveDiscount,
                    // D01: VAT nằm TRONG giá → đây là phần thuế TÁCH RA, không cộng thêm vào Total.
                    cartTotals.TaxAmount,
                    cart.ShippingAmount,
                    cartTotals.Total,
                    cart.TaxRate,
                    cart.CouponCode,
                    cartLines.Select((i, index) => new CartItemDto(
                        i.ProductId,
                        i.ProductName,
                        i.Price,
                        i.Quantity,
                        i.Subtotal,
                        products.TryGetValue(i.ProductId, out var img) ? img : null,
                        // Không còn "999" bịa ra khi thiếu dòng kho — 0 nghĩa là hết hàng thật.
                        stockByKey.TryGetValue((i.ProductId, i.VariantId), out var stock)
                            ? stock
                            : (stockByProduct.TryGetValue(i.ProductId, out var pStock) ? pStock : 0),
                        // Snapshot biến thể trong giỏ hàng — không đổi khi admin sửa tên biến thể sau.
                        i.VariantId,
                        i.VariantName,
                        i.VariantSku,
                        i.BundleId,
                        i.BundleName,
                        cartTotals.Lines[index].LineDiscount,
                        cartTotals.Lines[index].Payable + cartTotals.Lines[index].AllocatedOrderDiscount
                    )).ToList(),
                    cartTotals.VatBreakdown,
                    bundles.Groups.Select(g => new CartBundleGroupDto(
                        g.BundleId, g.Name, g.IsApplied, g.Reason, g.Sets, g.ListTotal, g.BundleTotal, g.Discount)).ToList()
                ));
            }
            catch (Exception)
            {
                // KHÔNG trả chi tiết exception ra client (trước đây lộ stack/thông điệp EF).
                return Results.Problem("Không tải được giỏ hàng. Vui lòng thử lại.");
            }
        });

    }
}
