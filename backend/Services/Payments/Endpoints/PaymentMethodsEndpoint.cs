using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Payments.Application.Configuration;

namespace Payments.Endpoints;

/// <summary>
/// W0-10 (D04 R1) — `GET /api/payments/methods`: NGUỒN SỰ THẬT DUY NHẤT về phương thức thanh toán.
/// Checkout, footer, trang sản phẩm, trang chính sách và POS đều render từ đây; cấm hardcode danh sách.
/// Public, cache 60s. Chỉ trả về phương thức ĐANG bật — provider thiếu khoá đơn giản là không xuất hiện.
/// Trên dữ liệu dev hiện tại (0 khoá thật) kết quả đúng là `[cod]`.
/// </summary>
public static class PaymentMethodsEndpoint
{
    public static void MapPaymentMethodsEndpoint(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/payments/methods", (HttpContext ctx, PaymentConfigGuard guard) =>
        {
            ctx.Response.Headers.CacheControl = "public, max-age=60";

            var methods = guard.AvailableMethods().Select(m => new
            {
                code = m.Code,
                name = m.DisplayName,
                description = m.Description,
                requiresRedirect = m.RequiresRedirect,
                sortOrder = m.SortOrder
            });

            return Results.Ok(methods);
        })
        .AllowAnonymous()
        .WithName("GetPaymentMethods");
    }
}
