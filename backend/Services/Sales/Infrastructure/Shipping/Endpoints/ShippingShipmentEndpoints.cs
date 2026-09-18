using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Infrastructure.Shipping.Endpoints;

/// <summary>
/// Tạo vận đơn cho đơn hàng — GHN nếu đã cấu hình, ngược lại CHẾ ĐỘ THỦ CÔNG (nhân viên tự nhập hãng
/// + mã vận đơn). Phase-49 bước 3 + 5: KHÔNG BAO GIỜ giả một thành công GHN khi chưa cấu hình
/// (trước đây <c>CreateGHNService</c> luôn dựng client dù <c>Token</c> rỗng, gọi ra ngoài thất bại
/// âm thầm và trả <c>trackingCode = ""</c> — nhìn như "đã tạo vận đơn" nhưng thực ra không có gì).
/// </summary>
internal static class ShippingShipmentEndpoints
{
    /// <summary>Cân nặng mặc định (gram) khi sản phẩm chưa khai báo cân nặng — không có field cân
    /// nặng theo danh mục trong <c>Catalog.Domain.Category</c> hôm nay, nên fallback là MỘT hằng số
    /// toàn cục qua <see cref="BuildingBlocks.Configuration.IAppSettings"/>, không phải theo danh mục
    /// như mô tả trong phase file — xem ghi chú "Unresolved" trong report.</summary>
    private const int DefaultItemWeightGrams = 500;

    public static void Map(RouteGroupBuilder group)
    {
        group.MapPost("/create-shipment/{orderId:guid}", CreateShipmentAsync)
            .RequireAuthorization(Permissions.Sales.UpdateStatus);

        group.MapPost("/manual-shipment/{orderId:guid}", SetManualShipmentAsync)
            .RequireAuthorization(Permissions.Sales.UpdateStatus);
    }

    private static async Task<IResult> CreateShipmentAsync(
        Guid orderId,
        CreateShipmentRequest request,
        SalesDbContext db,
        CatalogDbContext catalogDb,
        IConfiguration config,
        CancellationToken ct)
    {
        var order = await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == orderId, ct);
        if (order == null) throw NotFoundException.For("đơn hàng", orderId);

        if (order.Status != OrderStatus.Paid && order.Status != OrderStatus.Confirmed)
            throw new DomainException($"Không thể tạo vận đơn cho đơn hàng ở trạng thái {order.Status}");

        var ghnToken = config["Shipping:GHN:Token"];
        var ghnShopId = config["Shipping:GHN:ShopId"];
        if (string.IsNullOrWhiteSpace(ghnToken) || string.IsNullOrWhiteSpace(ghnShopId))
        {
            // Bước 5 — GHN chưa cấu hình = chế độ thủ công, không gọi GHN, không giả kết quả.
            return Results.Ok(new
            {
                mode = "manual",
                message = "Chưa cấu hình GHN — dùng POST .../manual-shipment để nhập vận đơn thủ công.",
                orderStatus = order.Status.ToString(),
            });
        }

        var weight = await ResolveWeightGramsAsync(order, catalogDb, ct);
        var goodsValue = (int)Math.Max(0, order.TotalAmount - order.ShippingAmount);
        // Bước 3 — cod_amount = SỐ TIỀN CÒN LẠI khách phải trả khi nhận; đơn đã thanh toán online = 0.
        var codAmount = order.PaymentStatus == PaymentStatus.Paid ? 0 : (int)Math.Max(0, order.TotalAmount);
        // payment_type_id GHN: 1 = SHOP trả phí ship, 2 = người NHẬN trả phí ship (khác cod_amount).
        // Đơn được freeship (ShippingAmount = 0, không phải nhận tại cửa hàng) = shop đang gánh phí ->
        // shop trả GHN; còn lại người nhận trả phí ship khi nhận hàng.
        var shopPaysShippingFee = order.ShippingAmount <= 0m && !order.IsPickup;

        var ghn = new GHNService(new GHNConfig
        {
            Token = ghnToken,
            ShopId = ghnShopId,
            Endpoint = config["Shipping:GHN:Endpoint"] ?? "https://dev-online-gateway.ghn.vn/shiip/public-api"
        }, new HttpClient());

        var ghnRequest = new GHNCreateOrderRequest
        {
            to_name = request.ReceiverName,
            to_phone = request.ReceiverPhone,
            to_address = order.ShippingAddress,
            to_district_id = request.ToDistrictId,
            to_ward_code = request.ToWardCode,
            weight = weight,
            payment_type_id = shopPaysShippingFee ? 1 : 2,
            cod_amount = codAmount,
            insurance_value = goodsValue,
            required_note = "KHONGCHOXEMHANG",
            items = order.Items.Select(i => new GHNItem
            {
                name = i.ProductName,
                quantity = i.Quantity,
                weight = weight,
            }).ToList()
        };

        var result = await ghn.CreateShipment(ghnRequest);

        if (string.IsNullOrEmpty(result.OrderCode))
        {
            // GHN gọi được nhưng không trả mã vận đơn — KHÔNG đổi trạng thái đơn, để nhân viên
            // biết mà thử lại hoặc chuyển sang thủ công, thay vì đơn "coi như đã ship" mà không có gì.
            return Results.Ok(new
            {
                mode = "ghn",
                trackingCode = (string?)null,
                message = "GHN không trả mã vận đơn — đơn CHƯA được đánh dấu đã giao vận.",
                orderStatus = order.Status.ToString(),
            });
        }

        order.MarkAsShipped(result.OrderCode, "GHN");
        order.SetShippingTracking(order.ShippingAmount, result.OrderCode, "GHN");
        db.OrderHistories.Add(new OrderHistory(
            order.Id, OrderStatus.Paid, OrderStatus.Shipped,
            "System", "Đã tạo vận đơn GHN: " + result.OrderCode));
        await db.SaveChangesAsync(ct);

        return Results.Ok(new
        {
            mode = "ghn",
            trackingCode = result.OrderCode,
            expectedDelivery = result.ExpectedDeliveryTime,
            orderStatus = order.Status.ToString(),
        });
    }

    private static async Task<IResult> SetManualShipmentAsync(
        Guid orderId, ManualShipmentRequest request, SalesDbContext db, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Carrier) || string.IsNullOrWhiteSpace(request.TrackingNumber))
            throw new RequestValidationException(new[]
            {
                new ApiFieldError("carrier", "NotEmptyValidator", "Cần nhập hãng vận chuyển và mã vận đơn."),
            });

        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId, ct);
        if (order == null) throw NotFoundException.For("đơn hàng", orderId);

        if (order.Status != OrderStatus.Paid && order.Status != OrderStatus.Confirmed)
            throw new DomainException($"Không thể tạo vận đơn cho đơn hàng ở trạng thái {order.Status}");

        order.MarkAsShipped(request.TrackingNumber.Trim(), request.Carrier.Trim());
        order.SetShippingTracking(order.ShippingAmount, request.TrackingNumber.Trim(), request.Carrier.Trim());
        db.OrderHistories.Add(new OrderHistory(
            order.Id, OrderStatus.Paid, OrderStatus.Shipped,
            "System", $"Đã tạo vận đơn thủ công ({request.Carrier}): {request.TrackingNumber}"));
        await db.SaveChangesAsync(ct);

        return Results.Ok(new
        {
            mode = "manual",
            trackingCode = request.TrackingNumber,
            carrier = request.Carrier,
            orderStatus = order.Status.ToString(),
        });
    }

    /// <summary>Cân nặng gói hàng = tổng (cân nặng sản phẩm × số lượng); sản phẩm chưa khai báo cân
    /// nặng hoặc không còn tồn tại trong Catalog (D03: xoá mềm/ẩn) dùng <see cref="DefaultItemWeightGrams"/>.
    /// <c>Products.Weight</c> lưu theo KG (<c>ProductImportModels.WeightKg</c>,
    /// <c>CatalogDbContext</c>: precision 10,3) — GHN cần GRAM, nên nhân 1000 trước khi cộng.</summary>
    private static async Task<int> ResolveWeightGramsAsync(Order order, CatalogDbContext catalogDb, CancellationToken ct)
    {
        var productIds = order.Items.Select(i => i.ProductId).Distinct().ToList();
        var weightsKgByProduct = await catalogDb.Products
            .AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Weight })
            .ToDictionaryAsync(p => p.Id, p => p.Weight, ct);

        decimal totalGrams = 0;
        foreach (var item in order.Items)
        {
            var perUnitGrams = weightsKgByProduct.TryGetValue(item.ProductId, out var kg) && kg > 0
                ? kg * 1000m
                : DefaultItemWeightGrams;
            totalGrams += perUnitGrams * item.Quantity;
        }

        return totalGrams > 0 ? (int)Math.Ceiling(totalGrams) : DefaultItemWeightGrams;
    }
}

public record CreateShipmentRequest(string ReceiverName, string ReceiverPhone, int ToDistrictId, string ToWardCode, int Weight = 0);
public record ManualShipmentRequest(string Carrier, string TrackingNumber);
