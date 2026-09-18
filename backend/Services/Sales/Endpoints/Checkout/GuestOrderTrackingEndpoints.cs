using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Infrastructure;

namespace Sales.Endpoints.Checkout;

/// <summary>
/// Tra cứu đơn cho khách VÃNG LAI: <c>GET /api/sales/public/orders/track?orderNumber=&amp;phone=</c>.
///
/// Khách không có tài khoản vẫn phải xem được đơn mình vừa đặt — trước W2-3 thì không có đường nào,
/// đặt xong là mất dấu.
///
/// Chống dò: BẮT BUỘC có cả mã đơn VÀ số điện thoại, và cả hai phải khớp cùng một đơn. Chỉ mã đơn
/// thôi thì ai đoán được mã là đọc được địa chỉ nhà người khác. So sánh số điện thoại sau khi bỏ
/// mọi ký tự không phải chữ số nên "0912 345 678" và "0912345678" là một.
/// Trả về đúng những gì khách cần để theo dõi đơn: KHÔNG có email, KHÔNG có ghi chú nội bộ,
/// KHÔNG có mã giảm giá.
/// </summary>
internal static class GuestOrderTrackingEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/sales/public/orders/track", async (
            string? orderNumber,
            string? phone,
            SalesDbContext db,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(orderNumber) || string.IsNullOrWhiteSpace(phone))
                return Results.BadRequest(new { Error = "Cần cả mã đơn hàng và số điện thoại đặt hàng" });

            var normalizedPhone = Digits(phone);
            if (normalizedPhone.Length < 9)
                return Results.BadRequest(new { Error = "Số điện thoại không hợp lệ" });

            var code = orderNumber.Trim().ToUpperInvariant();
            var order = await db.Orders
                .AsNoTracking()
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.OrderNumber.ToUpper() == code, ct);

            // Sai mã và sai số điện thoại trả về CÙNG một thông báo — không tiết lộ mã nào có thật.
            if (order == null || Digits(order.CustomerPhone) != normalizedPhone)
                return Results.NotFound(new { Error = "Không tìm thấy đơn hàng khớp thông tin đã nhập" });

            return Results.Ok(new
            {
                order.OrderNumber,
                Status = order.Status.ToString(),
                PaymentStatus = order.PaymentStatus.ToString(),
                FulfillmentStatus = order.FulfillmentStatus.ToString(),
                order.OrderDate,
                order.ConfirmedAt,
                order.ShippedAt,
                order.DeliveredAt,
                order.CancelledAt,
                order.SubtotalAmount,
                order.DiscountAmount,
                order.ShippingAmount,
                order.TaxAmount,
                order.TotalAmount,
                order.ShippingAddress,
                order.CustomerName,
                order.DeliveryTrackingNumber,
                order.DeliveryCarrier,
                Items = order.Items.Select(i => new
                {
                    i.ProductName,
                    i.VariantName,
                    i.Quantity,
                    i.UnitPrice,
                    i.LineTotal,
                    i.IsGift,
                }),
            });
        }).AllowAnonymous();
    }

    private static string Digits(string? value)
        => string.IsNullOrEmpty(value) ? string.Empty : new string(value.Where(char.IsDigit).ToArray());
}
