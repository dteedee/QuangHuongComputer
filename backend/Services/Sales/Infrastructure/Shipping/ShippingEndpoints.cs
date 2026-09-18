using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Sales.Infrastructure.Shipping.Endpoints;

namespace Sales.Infrastructure.Shipping;

/// <summary>
/// Điểm nạp route duy nhất của module Shipping (phase-49 / W2-11). Gọi từ
/// <c>backend/ApiGateway/Program.cs</c> (ngoài ownership glob — KHÔNG sửa ở đây, chỉ thêm route mới
/// dưới cùng gốc <c>/api/sales/shipping</c> + giữ các route <c>/api/shipping/*</c> cũ để không phá
/// vỡ bất cứ thứ gì đang gọi vào chúng).
///
/// Từng nhóm endpoint tách file riêng trong <c>Endpoints/</c> (mỗi file &lt; 200 dòng theo quy ước
/// modularization):
///  - <see cref="ShippingQuoteEndpoints"/>   — POST /api/sales/shipping/quote (bước 1)
///  - <see cref="ShippingAddressEndpoints"/> — GET  /api/sales/shipping/provinces(+/{code}/wards) (bước 2)
///  - <see cref="ShippingShipmentEndpoints"/>— POST /api/shipping/create-shipment + /manual-shipment (bước 3 + 5)
///  - <see cref="ShippingTrackingEndpoints"/>— GET  /api/shipping/tracking/{orderId} + webhook (bước 4)
/// </summary>
public static class ShippingEndpoints
{
    public static void MapShippingEndpoints(this IEndpointRouteBuilder app)
    {
        var salesShippingGroup = app.MapGroup("/api/sales/shipping");
        ShippingQuoteEndpoints.Map(salesShippingGroup);
        ShippingAddressEndpoints.Map(salesShippingGroup);

        var legacyGroup = app.MapGroup("/api/shipping");
        ShippingShipmentEndpoints.Map(legacyGroup);
        ShippingQuoteEndpoints.MapLegacyCalculateFee(app);

        ShippingTrackingEndpoints.MapAuthenticated(app);
        ShippingTrackingEndpoints.MapWebhook(app);
    }
}
