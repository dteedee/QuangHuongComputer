using BuildingBlocks.Endpoints;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Caching.Memory;
using Sales.Infrastructure.Shipping.AddressReference;

namespace Sales.Infrastructure.Shipping.Endpoints;

/// <summary>
/// Dữ liệu tham chiếu tỉnh/xã-phường 2 cấp (hiệu lực 2025-07-01) — thay cho việc FE gọi API tỉnh/
/// thành của bên thứ ba và mô hình 3 cấp cũ (tỉnh/huyện/xã). Public, không dữ liệu khách hàng nên
/// cache-friendly (60 phút, dữ liệu tĩnh theo build).
///
/// Đặt <c>Cache-Control</c> thủ công thay vì <c>.CacheOutput()</c>: <c>ServiceRegistration.cs</c>
/// (W1-5/W2-17, không thuộc ownership của track này) mới gọi <c>AddOutputCache()</c> chứ CHƯA gọi
/// <c>app.UseOutputCache()</c> (xem ghi chú tại đó) — gắn <c>.CacheOutput()</c> lúc này chỉ là
/// metadata chết, không cache gì cả. Header HTTP chuẩn thì luôn có tác dụng (browser + mọi CDN/proxy
/// phía trước), không phụ thuộc middleware đó có được bật hay không.
///
/// <see cref="IVnAddressReferenceService"/> KHÔNG được đăng ký qua DI container (đăng ký nằm ở
/// <c>Sales/DependencyInjection.cs</c>, ngoài ownership glob của track này) — dựng trực tiếp từ
/// <see cref="IMemoryCache"/> (đã có sẵn qua DI nhờ <c>AddAppSettings()</c> gọi
/// <c>services.AddMemoryCache()</c> toàn cục), cùng khuôn mẫu <c>CreateGHNService</c> có sẵn trong
/// file này trước track. Việc parse JSON chỉ chạy 1 lần — kết quả cache trong chính
/// <see cref="IMemoryCache"/> singleton, dựng lại object service mỗi request không tốn gì thêm.
/// </summary>
internal static class ShippingAddressEndpoints
{
    public static void Map(RouteGroupBuilder group)
    {
        group.MapGet("/provinces", (HttpContext ctx, IMemoryCache cache) =>
        {
            var svc = new VnAddressReferenceService(cache);
            SetPublicCache(ctx);
            return Results.Ok(new { version = svc.Version, provinces = svc.GetProvinces() });
        }).AllowAnonymous();

        group.MapGet("/provinces/{code}/wards", (string code, HttpContext ctx, IMemoryCache cache) =>
        {
            var svc = new VnAddressReferenceService(cache);
            if (!svc.ProvinceExists(code))
                throw NotFoundException.For("tỉnh/thành phố", code);

            SetPublicCache(ctx);
            return Results.Ok(new { version = svc.Version, provinceCode = code, wards = svc.GetWards(code) });
        }).AllowAnonymous();
    }

    private static void SetPublicCache(HttpContext ctx)
        => ctx.Response.Headers.CacheControl = "public, max-age=3600";
}
