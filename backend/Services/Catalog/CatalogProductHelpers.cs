using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;
using Catalog.Domain;
using BuildingBlocks.Caching;
using BuildingBlocks.Endpoints;

namespace Catalog;

/// <summary>
/// Phần dùng chung giữa `CatalogProductQueryEndpoints` (đọc) và
/// `CatalogProductAdminEndpoints` (ghi).
/// </summary>
internal static class CatalogProductHelpers
{
    /// <summary>
    /// Hậu tố phiên bản của khoá cache. Hình dạng JSON của sản phẩm đã đổi (thêm
    /// rangeFrom/rangeTo, categorySlug/brandSlug, SEO) nên bản cache cũ phải bị bỏ qua.
    /// Vẫn nằm trong pattern `products:list*` / `product*` để RemoveByPatternAsync xoá được.
    /// </summary>
    internal const string CacheVersion = ":v2";

    /// <summary>
    /// Nạp 1 sản phẩm. `includeInactive` bỏ qua bộ lọc toàn cục `IsActive` - BẮT BUỘC cho
    /// mọi đường admin, nếu không hàng đã gỡ bán sẽ không bao giờ bật lại được
    /// (`FindAsync` cũng bị bộ lọc chặn nên trước đây trả 404).
    /// </summary>
    internal static Task<Product?> LoadProductAsync(CatalogDbContext db, Guid id, bool includeInactive, bool tracking)
    {
        IQueryable<Product> q = includeInactive ? db.Products.IgnoreQueryFilters() : db.Products;
        if (!tracking) q = q.AsNoTracking();
        return q.Include(p => p.Category).Include(p => p.Brand).FirstOrDefaultAsync(p => p.Id == id);
    }

    /// <summary>Bật/tắt/đảo trạng thái sản phẩm. `active = null` nghĩa là đảo.</summary>
    internal static async Task<IResult> SetProductActiveAsync(
        Guid id, CatalogDbContext db, ICacheService cache, HttpContext httpContext, bool? active)
    {
        var product = await LoadProductAsync(db, id, includeInactive: true, tracking: true);
        if (product == null)
            return Results.NotFound(new { Error = "Product not found" });

        product.IsActive = active ?? !product.IsActive;
        product.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await httpContext.LogAuditAsync(
            product.IsActive ? "Activate" : "Deactivate", "Product", id.ToString(), $"Name: {product.Name}");
        await InvalidateProductCachesAsync(cache, id);

        return Results.Ok(new
        {
            Message = product.IsActive ? "Product activated" : "Product deactivated",
            IsActive = product.IsActive
        });
    }

    internal static async Task InvalidateProductCachesAsync(ICacheService cache, Guid id)
    {
        await cache.RemoveAsync(CacheKeys.ProductKey(id));
        await cache.RemoveAsync(CacheKeys.ProductKey(id) + CacheVersion);
        await cache.RemoveByPatternAsync(CacheKeys.ProductsListPattern);
        await cache.RemoveAsync(CacheKeys.RelatedProductsKey(id));
        await cache.RemoveAsync(CacheKeys.RelatedProductsKey(id) + CacheVersion);
    }

    /// <summary>
    /// Bước 5 "Rating/review count... become real": gọi sau MỌI thay đổi trạng thái duyệt của
    /// review (approve/reject/xoá) - tính lại từ đúng tập review `IsApproved = true` hiện tại,
    /// không cộng/trừ tăng dần (tránh lệch nếu có thao tác song song).
    /// </summary>
    internal static async Task RecalculateReviewStatsAsync(CatalogDbContext db, Guid productId, CancellationToken ct = default)
    {
        var approvedRatings = await db.ProductReviews.AsNoTracking()
            .Where(r => r.ProductId == productId && r.IsApproved)
            .Select(r => r.Rating)
            .ToListAsync(ct);

        var product = await db.Products.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Id == productId, ct);
        if (product == null) return;

        var average = approvedRatings.Count > 0 ? (float)Math.Round(approvedRatings.Average(), 2) : 0f;
        product.UpdateReviewStats(average, approvedRatings.Count);
        await db.SaveChangesAsync(ct);
    }
}
