using BuildingBlocks.Caching;
using Catalog.Application.Products;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Catalog;

/// <summary>
/// <c>GET /api/catalog/products/{id}/bought-together?limit=6[&amp;selected=id1,id2]</c> — khối "Thường được
/// mua cùng" trên trang sản phẩm và hàng gợi ý trong giỏ. <c>selected</c>: khách bỏ chọn bớt món thì
/// <c>total</c> vẫn do SERVER tính (sản phẩm gốc + các món được chọn); vắng mặt = chọn tất cả.
///
/// Công khai (allow-list: <c>PublicEndpointAllowList</c>, mục "bought-together"): chỉ trả sản phẩm
/// đã đăng web kèm SỐ ĐƠN tổng hợp, không có dữ liệu đơn hay khách.
///
/// Cache: MỘT khoá mỗi sản phẩm, luôn tính ở <see cref="BoughtTogetherService.MaxLimit"/> rồi cắt theo
/// <c>limit</c> khi trả — top-N của top-12 chính là top-N, nên không cần khoá riêng cho từng limit
/// (và <c>InvalidateProductCachesAsync</c> xoá được đúng một khoá). Dữ liệu mua kèm đổi chậm nên
/// giữ 3 giờ; giá trên thẻ có thể trễ tối đa chừng đó, còn giỏ hàng luôn tính lại giá thật.
/// </summary>
public static class CatalogBoughtTogetherEndpoints
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(3);

    public static void MapCatalogBoughtTogetherEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapGet("/products/{productId:guid}/bought-together", async (
            Guid productId, BoughtTogetherService service, ICacheService cache,
            int? limit, string? selected, CancellationToken ct) =>
        {
            var take = BoughtTogetherService.ClampLimit(limit);
            var cacheKey = CacheKeys.BoughtTogetherKey(productId) + CatalogProductHelpers.CacheVersion;

            var full = await cache.GetAsync<BoughtTogetherResult>(cacheKey);
            if (full is null)
            {
                full = await service.GetAsync(productId, BoughtTogetherService.MaxLimit, ct);
                if (full is null) return Results.NotFound();
                await cache.SetAsync(cacheKey, full, CacheTtl);
            }

            return Results.Ok(Slice(full, take, ParseSelected(selected)));
        });
    }

    /// <summary>
    /// Cắt về <paramref name="take"/> gợi ý; <c>Total</c> = giá sản phẩm gốc + các món trong
    /// <paramref name="selected"/> (null = mọi món đã cắt). Id lạ bị bỏ qua — không thể "chọn" một
    /// sản phẩm ngoài danh sách để lấy giá.
    /// </summary>
    public static BoughtTogetherResult Slice(BoughtTogetherResult full, int take, IReadOnlySet<Guid>? selected = null)
    {
        var items = full.Items.Take(take).ToList();
        var priced = selected is null ? items : items.Where(i => selected.Contains(i.Product.Id));
        return full with { Items = items, Total = full.Anchor.Price + priced.Sum(i => i.Product.Price) };
    }

    /// <summary>"a,b,c" → tập GUID; null khi không gửi tham số. Tối đa 12 giá trị, phần lỗi bỏ qua.</summary>
    public static IReadOnlySet<Guid>? ParseSelected(string? selected)
    {
        if (selected is null) return null;
        return selected.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Take(BoughtTogetherService.MaxLimit)
            .Select(v => Guid.TryParse(v, out var id) ? id : Guid.Empty)
            .Where(id => id != Guid.Empty)
            .ToHashSet();
    }
}
