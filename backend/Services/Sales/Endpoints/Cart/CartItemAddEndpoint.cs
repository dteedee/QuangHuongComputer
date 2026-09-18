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
/// POST /api/sales/cart/items — thêm sản phẩm vào giỏ (chỉ KIỂM tồn, không giữ chỗ).
/// </summary>
internal static class CartItemAddEndpoint
{
    /// <summary>W0-4: trần số lượng mỗi dòng giỏ hàng — chặn đơn 2 tỷ cái do lỗi/khai thác.</summary>
    private const int MaxQuantityPerCartLine = 99;

    public static void MapCartItemAddEndpoint(RouteGroupBuilder group)
    {
        group.MapPost("/cart/items", async ([FromBody] AddToCartDto dto, SalesDbContext db, InventoryDbContext inventoryDb, CatalogDbContext catalogDb, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            if (dto.Quantity <= 0)
                return Results.BadRequest(new { Error = "Số lượng phải lớn hơn 0" });

            if (dto.Quantity > MaxQuantityPerCartLine)
                return Results.BadRequest(new { Error = $"Số lượng tối đa mỗi sản phẩm là {MaxQuantityPerCartLine}" });

            // 1. W0-4: TÊN và GIÁ lấy từ Catalog, KHÔNG tin dto.ProductName/dto.Price.
            //    TRƯỚC: client gửi price tuỳ ý → giỏ hàng (và đơn) mang giá do khách tự đặt.
            var productSnapshot = await catalogDb.Products
                .AsNoTracking()
                .Where(p => p.Id == dto.ProductId)
                .Select(p => new { p.Name, p.Price, p.IsActive })
                .FirstOrDefaultAsync();

            if (productSnapshot == null || !productSnapshot.IsActive)
                return Results.BadRequest(new { Error = "Sản phẩm không tồn tại hoặc đã ngừng kinh doanh" });

            var productName = productSnapshot.Name;
            var unitPrice = productSnapshot.Price;

            // Nếu sản phẩm có biến thể → snapshot Name/Sku/Price của biến thể (vẫn từ Catalog).
            string? variantName = null;
            string? variantSku = null;
            if (dto.VariantId.HasValue)
            {
                var variantSnapshot = await catalogDb.ProductVariants
                    .AsNoTracking()
                    .Where(v => v.Id == dto.VariantId.Value && v.ProductId == dto.ProductId)
                    .Select(v => new { v.Name, v.Sku, v.Price })
                    .FirstOrDefaultAsync();

                if (variantSnapshot == null)
                    return Results.BadRequest(new { Error = "Biến thể không tồn tại" });

                variantName = variantSnapshot.Name;
                variantSku = variantSnapshot.Sku;
                if (variantSnapshot.Price > 0) unitPrice = variantSnapshot.Price;
            }

            // 2. Tồn kho — theo (ProductId, VariantId). W0-4: KHÔNG còn tự tạo InventoryItem qty=100.
            //    Tự tạo tồn ảo khiến mọi GUID đều "còn 100 cái" → bán hàng không có thật.
            var inventoryItem = await inventoryDb.InventoryItems
                .FirstOrDefaultAsync(i => i.ProductId == dto.ProductId && i.VariantId == dto.VariantId);

            if (inventoryItem == null)
                return Results.BadRequest(new { Error = "Sản phẩm đã hết hàng" });

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
            {
                cart = new Cart(userId);
                db.Carts.Add(cart);
            }

            // 3. Dòng giỏ hàng unique theo (ProductId, VariantId) — không gộp khác biến thể.
            var existingItem = cart.Items.FirstOrDefault(i =>
                i.ProductId == dto.ProductId && i.VariantId == dto.VariantId);
            var totalQuantity = dto.Quantity + (existingItem?.Quantity ?? 0);

            if (totalQuantity > MaxQuantityPerCartLine)
                return Results.BadRequest(new { Error = $"Số lượng tối đa mỗi sản phẩm là {MaxQuantityPerCartLine}" });

            if (inventoryItem.AvailableQuantity < totalQuantity)
                return Results.BadRequest(new { Error = $"Không đủ hàng trong kho. Còn lại: {inventoryItem.AvailableQuantity}" });

            // W2-3: thêm vào giỏ CHỈ KIỂM TRA còn hàng, KHÔNG giữ chỗ.
            //
            // Trước đây mỗi lần bấm "Thêm vào giỏ" tạo một StockReservation cấp giỏ, TTL 24 giờ.
            // Giỏ hàng là nơi khách bỏ quên đồ hàng tuần — nên tồn khả dụng bị khoá 24 giờ cho
            // những món không ai định mua, trong khi khách thật thấy "hết hàng". Tệ hơn: giỏ,
            // phiên checkout và orchestrator đều giữ chỗ riêng ⇒ cùng một món bị giữ 2-3 lần và
            // huỷ đơn chỉ nhả được một phần.
            //
            // Giữ chỗ nay xảy ra ĐÚNG MỘT LẦN, lúc tạo phiên checkout (TTL 15 phút), qua
            // InventoryReservationService. Xem Application/Inventory/InventoryReservationService.cs.

            // 4. Thêm vào giỏ hàng — TÊN/GIÁ/biến thể đều là snapshot từ Catalog, không tin client.
            cart.AddItem(
                dto.ProductId,
                productName,
                unitPrice,
                dto.Quantity,
                dto.VariantId,
                variantName,
                variantSku);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Item added to cart" });
        });

    }
}
