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
/// Mã giảm giá, phí vận chuyển và xoá sạch giỏ. Trích nguyên văn bởi W2-3.
/// </summary>
internal static class CartOptionsEndpoints
{
    public static void MapCartOptionsEndpoints(RouteGroupBuilder group)
    {
        group.MapPost("/cart/apply-coupon", async ([FromBody] ApplyCouponDto dto, SalesDbContext salesDb, ContentDbContext contentDb, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await salesDb.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
                return Results.NotFound(new { Error = "Cart not found" });

            // Validate coupon — nguồn duy nhất: CouponValidator (Content.Coupons).
            var couponResult = await CouponValidator.ValidateAsync(contentDb, dto.CouponCode, cart.SubtotalAmount);
            if (!couponResult.Success)
                return Results.BadRequest(new { Error = couponResult.ErrorMessage ?? "Mã giảm giá không hợp lệ" });

            var discountAmount = couponResult.DiscountAmount;
            cart.ApplyCoupon(dto.CouponCode.ToUpper(), discountAmount);
            await salesDb.SaveChangesAsync();

            return Results.Ok(new
            {
                Message = "Áp dụng mã giảm giá thành công",
                DiscountAmount = discountAmount,
                TotalAmount = cart.TotalAmount
            });
        });

        group.MapDelete("/cart/remove-coupon", async (SalesDbContext db, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
                return Results.NotFound(new { Error = "Cart not found" });

            cart.RemoveCoupon();
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Đã xóa mã giảm giá" });
        });

        // W0-4: phí ship KHÔNG còn do client quyết định — server tính lại từ ShippingFeePolicy.
        // dto.ShippingAmount chỉ còn để tương thích payload cũ (giữ endpoint không 400).
        group.MapPost("/cart/set-shipping", async ([FromBody] SetShippingDto dto, SalesDbContext db, ClaimsPrincipal user, IConfiguration config) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
                return Results.NotFound(new { Error = "Cart not found" });

            var fee = ShippingFeePolicy.Calculate(
                cart.SubtotalAmount - cart.EffectiveDiscountAmount, isPickup: false, config);
            cart.SetShippingAmount(fee);
            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                Message = "Phí ship đã được cập nhật",
                ShippingAmount = fee,
                TotalAmount = cart.TotalAmount
            });
        });

        group.MapDelete("/cart/clear", async (SalesDbContext db, InventoryDbContext inventoryDb, ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var cart = await db.Carts
                .Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == userId);

            if (cart == null)
                return Results.NotFound(new { Error = "Cart not found" });

            // W2-3 (vá sau kiểm chứng): xoá giỏ KHÔNG đụng vào tồn kho.
            // Giỏ hàng không giữ chỗ nữa (giữ chỗ chỉ xảy ra lúc tạo phiên checkout), nên vòng lặp
            // ReleaseReservedStock cũ chỉ nhả nhầm phần giữ chỗ của phiên checkout người khác.
            cart.Clear();
            cart.RemoveCoupon();
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Giỏ hàng đã được xóa" });
        });

    }
}
