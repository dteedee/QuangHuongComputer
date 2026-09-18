using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Payments.Application.Providers;

namespace Payments.Endpoints;

/// <summary>
/// W0-10 (D04 R1) — `GET /api/payments/methods`: NGUỒN SỰ THẬT DUY NHẤT về phương thức thanh toán.
/// Checkout, footer, trang sản phẩm, trang chính sách và POS đều render từ đây; cấm hardcode danh sách.
/// Public, cache 60s.
///
/// W2-4: lọc qua <see cref="PaymentProviderRegistry"/> chứ không chỉ qua cấu hình — một cổng có khoá
/// thật nhưng CHƯA có code (VNPay trước W2-21) sẽ không hiện ra, vì hiện ra là hứa với khách một
/// phương thức mà `/initiate` chắc chắn từ chối.
/// `installment` (D10) là phương thức "dẫn hướng": không cần chiến lược, chỉ cần danh sách đối tác.
/// Trên dữ liệu dev hiện tại (0 khoá thật, 0 đối tác) kết quả đúng là `[cod]`.
/// </summary>
public static class PaymentMethodsEndpoint
{
    public static void MapPaymentMethodsEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/payments/methods", (HttpContext ctx, PaymentProviderRegistry registry) =>
        {
            ctx.Response.Headers.CacheControl = "public, max-age=60";

            var methods = registry.PublicMethods().Select(m => new
            {
                code = m.Code,
                name = m.DisplayName,
                description = m.Description,
                requiresRedirect = m.RequiresRedirect,
                // false ⇒ FE dẫn khách sang luồng hồ sơ (trả góp), không gọi /initiate.
                direct = m.IsDirect,
                sortOrder = m.SortOrder
            });

            return Results.Ok(methods);
        })
        .AllowAnonymous()
        .WithName("GetPaymentMethods");
    }
}
