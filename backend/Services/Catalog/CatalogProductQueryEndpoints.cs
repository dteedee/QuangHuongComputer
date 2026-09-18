using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;
using Catalog.Domain;
using Catalog.Application.Products;
using Catalog.Application.Search;
using BuildingBlocks.Database;
using BuildingBlocks.Caching;

namespace Catalog;

/// <summary>
/// Đường ĐỌC "đơn giản" của sản phẩm: danh sách, chi tiết theo id, theo slug.
/// Tìm kiếm nâng cao + facet + liên quan -> `CatalogProductSearchEndpoints.cs` (giữ file dưới 200 dòng).
/// Đường GHI (admin) ở `CatalogProductAdminEndpoints.cs`.
/// </summary>
public static class CatalogProductQueryEndpoints
{
    public static void MapCatalogProductQueryEndpoints(this IEndpointRouteBuilder group)
    {
        // ------------------------------------------------------------ list
        group.MapGet("/products", async (
            CatalogDbContext db,
            ICacheService cache,
            HttpContext http,
            int page = 1,
            int pageSize = 20,
            Guid? categoryId = null,
            Guid? brandId = null,
            string? search = null,
            string? q = null,
            bool? includeInactive = null) =>
        {
            var (validPage, validPageSize) = QueryOptimizationExtensions.ValidatePaginationParams(page, pageSize);
            var searchTerm = search ?? q;
            var showInactive = http.WantsInactive(includeInactive);

            var cacheKey = CacheKeys.ProductsListKey(validPage, validPageSize, categoryId, brandId, searchTerm)
                           + CatalogProductHelpers.CacheVersion;
            if (!showInactive)
            {
                var cachedResponse = await cache.GetAsync<object>(cacheKey);
                if (cachedResponse is not null) return Results.Ok(cachedResponse);
            }

            // D10: nhân viên xem TẤT CẢ (kể cả chưa đăng web); khách chỉ thấy hàng đã publish.
            // IgnoreQueryFilters BẮT BUỘC: filter toàn cục IsActive vẫn chạy dù có Where hay không.
            var baseQuery = showInactive
                ? db.Products.IgnoreQueryFilters()
                : db.Products.WherePublished();

            var query = baseQuery.AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.Brand)
                .AsQueryable();

            if (categoryId.HasValue) query = query.Where(p => p.CategoryId == categoryId.Value);
            if (brandId.HasValue) query = query.Where(p => p.BrandId == brandId.Value);
            query = query.ApplySearch(searchTerm);

            var total = await query.CountAsync();
            var products = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((validPage - 1) * validPageSize)
                .Take(validPageSize)
                .ToListAsync();

            var thumbs = await ProductDtoProjection.LoadPrimaryMediaAsync(db, products.Select(p => p.Id).ToList());
            var result = CatalogResponses.Paged(
                total, validPage, validPageSize,
                products.Select(p => ProductDtoProjection.ToDto(p, thumbs.GetValueOrDefault(p.Id).Thumb ?? thumbs.GetValueOrDefault(p.Id).Url)));

            if (!showInactive)
                await cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(10));

            return Results.Ok(result);
        });

        // ------------------------------------------------------------ detail (by id)
        group.MapGet("/products/{id:guid}", async (
            Guid id,
            string? include,
            CatalogDbContext db,
            ICacheService cache,
            HttpContext http,
            bool? includeInactive = null,
            CancellationToken ct = default) =>
        {
            var showInactive = http.WantsInactive(includeInactive);
            var includes = ProductDtoProjection.ParseInclude(include);

            // Bước 5: view count tăng ở MỌI lượt xem chi tiết (kể cả cache hit) - 1 ExecuteUpdate,
            // không Redis counter (YAGNI ở lưu lượng này).
            await db.Products.IgnoreQueryFilters().Where(p => p.Id == id)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.ViewCount, p => p.ViewCount + 1), ct);

            // Adversarial-verify fix: the old key embedded the raw `include` string
            // (`ProductKey(id) + $":{include}" + CacheVersion`), so EVERY write path that calls
            // `CatalogProductHelpers.InvalidateProductCachesAsync` (media, publish/unpublish,
            // review approve/reject, admin update...) removed a DIFFERENT key than this endpoint
            // reads/writes and never actually cleared it - confirmed live: publish/unpublish/review
            // stats kept serving a stale `ProductDto` for the full 30-min TTL. `RemoveByPatternAsync`
            // is a documented no-op in `BuildingBlocks/Caching/CacheService.cs` (IR filed, out of
            // this track's ownership), so per-`include`-value keys can never be reliably invalidated
            // from here. Only cache the bare (no `include=`) shape, under the exact key
            // `InvalidateProductCachesAsync` already clears; `include=`-bearing requests (richer PDP
            // reads) are always computed fresh - correctness over a cache hit for the rarer call.
            var canCache = !showInactive && string.IsNullOrEmpty(include);
            var cacheKey = CacheKeys.ProductKey(id) + CatalogProductHelpers.CacheVersion;
            if (canCache)
            {
                var cachedProduct = await cache.GetAsync<ProductDto>(cacheKey);
                if (cachedProduct is not null) return Results.Ok(cachedProduct);
            }

            var product = await CatalogProductHelpers.LoadProductAsync(db, id, showInactive, tracking: false);
            if (product == null) return Results.NotFound(new { Error = "Product not found" });
            // D10: khách vãng lai không được xem hàng chưa đăng web qua đường /{id} công khai.
            if (!showInactive && product.PublishedAt is null) return Results.NotFound(new { Error = "Product not found" });

            var dto = await ProductDtoProjection.BuildDetailAsync(db, product, includes, ct);

            if (canCache)
                await cache.SetAsync(cacheKey, dto, TimeSpan.FromMinutes(30));

            return Results.Ok(dto);
        });

        // ------------------------------------------------------------ by slug
        group.MapGet("/products/by-slug/{slug}", async (
            string slug, string? include, CatalogDbContext db, HttpContext http, bool? includeInactive = null, CancellationToken ct = default) =>
        {
            var showInactive = http.WantsInactive(includeInactive);
            var source = showInactive ? db.Products.IgnoreQueryFilters() : db.Products.WherePublished();

            var product = await source.AsNoTracking()
                .Include(p => p.Category).Include(p => p.Brand)
                .FirstOrDefaultAsync(p => p.Slug == slug, ct);
            if (product is null) return Results.NotFound();

            await db.Products.IgnoreQueryFilters().Where(p => p.Id == product.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.ViewCount, p => p.ViewCount + 1), ct);

            var includes = ProductDtoProjection.ParseInclude(include);
            var dto = await ProductDtoProjection.BuildDetailAsync(db, product, includes, ct);
            return Results.Ok(dto);
        });
    }
}
