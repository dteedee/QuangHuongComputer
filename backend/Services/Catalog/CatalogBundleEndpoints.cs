using Catalog.Application.Bundles;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Catalog;

/// <summary>
/// Combo sản phẩm — mặt CÔNG KHAI (chỉ GET, nằm trong allow-list <c>/api/catalog/**</c> GET).
/// Chỉ trả combo đang bật + trong khung hiệu lực + mọi món đã đăng web; giá combo và tiền tiết
/// kiệm tính lại từ giá hiện hành. Mặt quản trị: <see cref="CatalogBundleAdminEndpoints"/>.
/// Giá có thẩm quyền lúc chốt đơn vẫn do Sales tính lại (<c>BundleCartPricer</c>).
/// </summary>
public static class CatalogBundleEndpoints
{
    public static void MapCatalogBundleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog/bundles");

        group.MapGet("/", async (CatalogDbContext db, CancellationToken ct) =>
        {
            var bundles = await db.ProductBundles.Include(b => b.Items).AsNoTracking()
                .WhereLive(DateTime.UtcNow)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync(ct);
            return Results.Ok(await PublicViewsAsync(db, bundles, ct));
        });

        group.MapGet("/{id:guid}", async (Guid id, CatalogDbContext db, CancellationToken ct) =>
        {
            var bundle = await db.ProductBundles.Include(b => b.Items).AsNoTracking()
                .WhereLive(DateTime.UtcNow)
                .FirstOrDefaultAsync(b => b.Id == id, ct);
            if (bundle == null) return Results.NotFound();

            var views = await PublicViewsAsync(db, new[] { bundle }, ct);
            return views.Count == 0 ? Results.NotFound() : Results.Ok(views[0]);
        });

        // "Combo tiết kiệm" trên trang sản phẩm: mọi combo đang bán có chứa sản phẩm này.
        group.MapGet("/product/{productId:guid}", async (Guid productId, CatalogDbContext db, CancellationToken ct) =>
        {
            var bundles = await db.ProductBundles.Include(b => b.Items).AsNoTracking()
                .WhereLive(DateTime.UtcNow)
                .Where(b => b.Items.Any(i => i.ProductId == productId))
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync(ct);
            return Results.Ok(await PublicViewsAsync(db, bundles, ct));
        });

        group.MapCatalogBundleAdminEndpoints();
    }

    /// <summary>Khách không bao giờ thấy combo có món đã gỡ khỏi web hoặc không còn rẻ hơn giá lẻ.</summary>
    private static async Task<IReadOnlyList<BundleView>> PublicViewsAsync(
        CatalogDbContext db, IReadOnlyList<Domain.ProductBundle> bundles, CancellationToken ct)
    {
        var views = await BundleViewBuilder.BuildAsync(db, bundles, ct);
        return views.Where(v => v.Items.Count > 0 && v.Items.All(i => i.IsPublished) && v.Savings > 0m).ToList();
    }
}
