using System.Security.Claims;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Endpoints.Checkout;

/// <summary>
/// Giỏ hàng của khách VÃNG LAI + gộp giỏ khi đăng nhập.
///
/// Trước W2-3, giỏ của khách chưa đăng nhập chỉ sống trong <c>localStorage</c> của trình duyệt:
/// đổi máy là mất giỏ, và khi khách đăng nhập thì giỏ đó biến mất thay vì nhập vào tài khoản.
/// Nay giỏ vãng lai nằm trên server, khoá bằng cookie <c>qh_aid</c> (chỉ là một GUID ngẫu nhiên,
/// KHÔNG chứa thông tin cá nhân), và <c>POST /api/sales/cart/merge</c> nhập nó vào tài khoản.
/// </summary>
internal static class GuestCartEndpoints
{
    /// <summary>Tên cookie định danh phiên khách vãng lai.</summary>
    public const string AnonymousCookie = "qh_aid";

    private static readonly TimeSpan CookieLifetime = TimeSpan.FromDays(30);

    public static void Map(IEndpointRouteBuilder app)
    {
        // Giỏ vãng lai — công khai, khoá theo cookie.
        app.MapGet("/api/sales/public/cart", async (
            SalesDbContext db, HttpContext http, CancellationToken ct) =>
        {
            var anonymousId = ResolveAnonymousId(http);
            var cart = await db.Carts.Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.AnonymousId == anonymousId, ct);

            return Results.Ok(new
            {
                CartId = cart?.Id,
                Items = cart?.Items.Select(i => new
                {
                    i.ProductId, i.VariantId, i.ProductName, i.Price, i.Quantity, i.IsGift,
                }) ?? Enumerable.Empty<object>(),
                SubtotalAmount = cart?.SubtotalAmount ?? 0m,
            });
        }).AllowAnonymous();

        app.MapPost("/api/sales/public/cart/items", async (
            AddToCartDto dto, SalesDbContext db, HttpContext http, CancellationToken ct) =>
        {
            if (dto.Quantity <= 0) return Results.BadRequest(new { Error = "Số lượng phải lớn hơn 0" });

            var anonymousId = ResolveAnonymousId(http);
            var cart = await CheckoutCartResolver.ForGuestAsync(db, anonymousId, ct);
            // Giá KHÔNG lấy từ client; chốt đơn sẽ đọc lại giá thật từ CSDL.
            cart.AddItem(dto.ProductId, dto.ProductName, 0m, dto.Quantity, dto.VariantId, null, null);

            await db.SaveChangesAsync(ct);
            return Results.Ok(new { cart.Id, ItemCount = cart.Items.Count });
        }).AllowAnonymous();

        // Gộp giỏ vãng lai vào tài khoản ngay sau khi đăng nhập/đăng ký.
        app.MapPost("/api/sales/cart/merge", async (
            SalesDbContext db, ClaimsPrincipal user, HttpContext http, CancellationToken ct) =>
        {
            if (!Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var customerId))
                return Results.Unauthorized();

            var anonymousId = http.Request.Cookies[AnonymousCookie];
            if (string.IsNullOrWhiteSpace(anonymousId))
                return Results.Ok(new { Merged = false, Reason = "Không có giỏ vãng lai" });

            var guestCart = await db.Carts.Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.AnonymousId == anonymousId, ct);
            if (guestCart == null)
                return Results.Ok(new { Merged = false, Reason = "Không có giỏ vãng lai" });

            var userCart = await db.Carts.Include(c => c.Items)
                .FirstOrDefaultAsync(c => c.CustomerId == customerId, ct);

            if (userCart == null)
            {
                // Chưa có giỏ tài khoản → nhận luôn giỏ vãng lai, không cần copy từng dòng.
                guestCart.AssignToCustomer(customerId);
            }
            else
            {
                userCart.MergeFrom(guestCart);
                db.Carts.Remove(guestCart);
            }

            // Đơn đã đặt lúc còn vãng lai cũng được gắn về tài khoản.
            var guestOrders = await db.Orders
                .Where(o => o.AnonymousId == anonymousId)
                .ToListAsync(ct);
            foreach (var order in guestOrders) order.LinkToAccount(customerId);

            await db.SaveChangesAsync(ct);
            http.Response.Cookies.Delete(AnonymousCookie);

            return Results.Ok(new
            {
                Merged = true,
                CartId = userCart?.Id ?? guestCart.Id,
                LinkedOrders = guestOrders.Count,
            });
        }).RequireAuthorization(SecurityPolicies.Authenticated);
    }

    /// <summary>
    /// Lấy (hoặc cấp) định danh phiên vãng lai. Cookie là <c>HttpOnly</c> + <c>SameSite=Lax</c>:
    /// script trên trang không đọc được, và nó không đi kèm request từ site khác.
    /// </summary>
    public static string ResolveAnonymousId(HttpContext http)
    {
        var existing = http.Request.Cookies[AnonymousCookie];
        if (!string.IsNullOrWhiteSpace(existing) && Guid.TryParse(existing, out _))
            return existing;

        var generated = Guid.NewGuid().ToString();
        http.Response.Cookies.Append(AnonymousCookie, generated, new CookieOptions
        {
            HttpOnly = true,
            IsEssential = true,
            SameSite = SameSiteMode.Lax,
            Secure = http.Request.IsHttps,
            Expires = DateTimeOffset.UtcNow.Add(CookieLifetime),
            Path = "/",
        });

        return generated;
    }
}
