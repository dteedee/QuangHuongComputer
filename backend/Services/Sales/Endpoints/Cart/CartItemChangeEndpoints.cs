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
/// PUT/DELETE /api/sales/cart/items/{productId} — đổi số lượng và xoá dòng hàng.
/// </summary>
internal static class CartItemChangeEndpoints
{
    /// <summary>W0-4: trần số lượng mỗi dòng giỏ hàng — chặn đơn 2 tỷ cái do lỗi/khai thác.</summary>
    private const int MaxQuantityPerCartLine = 99;

    public static void MapCartItemChangeEndpoints(RouteGroupBuilder group)
    {
        group.MapPut("/cart/items/{productId:guid}", async (Guid productId, [FromBody] UpdateQuantityDto dto, SalesDbContext db, InventoryDbContext inventoryDb, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
                return Results.NotFound(new { Error = "Cart not found" });

            var existingItem = cart.Items.FirstOrDefault(i => i.ProductId == productId);
            if (existingItem == null)
                return Results.NotFound(new { Error = "Item not found in cart" });

            if (dto.Quantity <= 0)
                return Results.BadRequest(new { Error = "Số lượng phải lớn hơn 0" });

            if (dto.Quantity > MaxQuantityPerCartLine)
                return Results.BadRequest(new { Error = $"Số lượng tối đa mỗi sản phẩm là {MaxQuantityPerCartLine}" });

            var oldQuantity = existingItem.Quantity;

            // W2-3 (vá sau kiểm chứng đối kháng): đổi số lượng trong giỏ CHỈ KIỂM tồn.
            //
            // Bản trước vẫn giữ chỗ 24h ở nhánh tăng và NHẢ chỗ ở nhánh giảm, dù `POST /cart/items`
            // đã thôi giữ chỗ. Hai hệ quả đo được trên :5050:
            //  · tăng số lượng lại khoá tồn 24 giờ (ReferenceType='Cart') ⇒ không còn "đúng một
            //    điểm giữ chỗ" như phase-21 yêu cầu;
            //  · giảm/xoá dòng gọi ReleaseReservedStock cho số lượng mà giỏ CHƯA TỪNG giữ, và
            //    InventoryItem.ReleaseReservedStock cắt xuống ReservedQuantity ⇒ nó ăn vào phần
            //    giữ chỗ của PHIÊN CHECKOUT người khác: ReservedQuantity về 0 trong khi
            //    StockReservations của họ vẫn Active ⇒ sổ giữ chỗ lệch tồn, mở đường bán vượt.
            //
            // Giữ chỗ nay xảy ra đúng một điểm: lúc tạo phiên checkout (InventoryReservationService).
            if (dto.Quantity > oldQuantity)
            {
                var inventoryItem = await inventoryDb.InventoryItems
                    .FirstOrDefaultAsync(i => i.ProductId == productId && i.VariantId == existingItem.VariantId);

                if (inventoryItem == null)
                    return Results.BadRequest(new { Error = "Sản phẩm không tồn tại trong kho" });

                if (inventoryItem.AvailableQuantity < dto.Quantity)
                    return Results.BadRequest(new { Error = $"Không đủ hàng trong kho. Còn lại: {inventoryItem.AvailableQuantity}" });
            }

            cart.UpdateItemQuantity(productId, dto.Quantity);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Quantity updated" });
        });

        group.MapDelete("/cart/items/{productId:guid}", async (Guid productId, SalesDbContext db, InventoryDbContext inventoryDb, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
                return Results.NotFound(new { Error = "Cart not found" });

            // W2-3 (vá sau kiểm chứng): xoá dòng giỏ KHÔNG đụng vào tồn kho.
            // Giỏ hàng không giữ chỗ gì nữa, nên "nhả" ở đây chỉ có thể nhả NHẦM phần giữ chỗ
            // của phiên checkout người khác (đo được: ReservedQuantity 4 → 0 trong khi hai
            // StockReservations 'CheckoutSession' vẫn Active).
            cart.RemoveItem(productId);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Item removed from cart" });
        });

    }
}
