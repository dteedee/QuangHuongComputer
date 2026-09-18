using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;
using Catalog.Application.Search;
using BuildingBlocks.Database;
using BuildingBlocks.Caching;

namespace Catalog;

/// <summary>
/// Đường ĐỌC của sản phẩm: danh sách, chi tiết, theo slug, tìm kiếm nâng cao, sản phẩm liên quan.
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

            // Support both 'search' and 'q' parameters (q is an alias for search)
            var searchTerm = search ?? q;

            // BẢO MẬT: `includeInactive` để lộ hàng chưa xuất bản -> chỉ nhân viên mới dùng được.
            var showInactive = http.WantsInactive(includeInactive);

            var cacheKey = CacheKeys.ProductsListKey(validPage, validPageSize, categoryId, brandId, searchTerm)
                           + CatalogProductHelpers.CacheVersion;
            if (!showInactive)
            {
                var cachedResponse = await cache.GetAsync<dynamic>(cacheKey);
                if (cachedResponse is not null) return Results.Ok(cachedResponse);
            }

            // IgnoreQueryFilters là BẮT BUỘC: bộ lọc toàn cục `p.IsActive` vẫn chạy dù endpoint
            // có gọi `Where(p => p.IsActive)` hay không, nên trước đây `includeInactive` là no-op
            // (26 hàng trả về trên tổng số 28 trong DB).
            var baseQuery = showInactive ? db.Products.IgnoreQueryFilters() : db.Products;

            var query = baseQuery.AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.Brand)
                .AsQueryable();

            if (categoryId.HasValue)
                query = query.Where(p => p.CategoryId == categoryId.Value);

            if (brandId.HasValue)
                query = query.Where(p => p.BrandId == brandId.Value);

            // Vị từ tìm kiếm DÙNG CHUNG với /products/search (ILIKE + unaccent).
            query = query.ApplySearch(searchTerm);

            var total = await query.CountAsync();
            var products = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((validPage - 1) * validPageSize)
                .Take(validPageSize)
                .ToListAsync();

            var result = CatalogResponses.Paged(
                total, validPage, validPageSize,
                products.Select(CatalogResponses.ProductPayload));

            if (!showInactive)
                await cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(10));

            return Results.Ok(result);
        });

        // ------------------------------------------------------------ detail
        group.MapGet("/products/{id:guid}", async (
            Guid id,
            CatalogDbContext db,
            ICacheService cache,
            HttpContext http,
            bool? includeInactive = null) =>
        {
            var showInactive = http.WantsInactive(includeInactive);
            var cacheKey = CacheKeys.ProductKey(id) + CatalogProductHelpers.CacheVersion;

            // Nhân viên xem hàng đã gỡ bán thì không đụng tới cache công khai.
            if (!showInactive)
            {
                var cachedProduct = await cache.GetAsync<dynamic>(cacheKey);
                if (cachedProduct is not null) return Results.Ok(cachedProduct);
            }

            var product = await CatalogProductHelpers.LoadProductAsync(db, id, showInactive, tracking: false);
            if (product == null)
                return Results.NotFound(new { Error = "Product not found" });

            var result = CatalogResponses.ProductPayload(product);

            if (!showInactive)
                await cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(30));

            return Results.Ok(result);
        });

        // ------------------------------------------------------------ by slug
        group.MapGet("/products/by-slug/{slug}", async (string slug, CatalogDbContext db) =>
        {
            var product = await db.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.Brand)
                .FirstOrDefaultAsync(p => p.Slug == slug);

            return product is null ? Results.NotFound() : Results.Ok(CatalogResponses.ProductPayload(product));
        });

        // ------------------------------------------------------------ advanced search
        group.MapGet("/products/search", async (
            string? query,
            Guid? categoryId,
            Guid? brandId,
            decimal? minPrice,
            decimal? maxPrice,
            bool? inStock,
            string? sortBy,
            CatalogDbContext db,
            ICacheService cache,
            int page = 1,
            int pageSize = 20) =>
        {
            var (validPage, validPageSize) = QueryOptimizationExtensions.ValidatePaginationParams(page, pageSize);

            var cacheKey = $"{CacheKeys.ProductsListKey(validPage, validPageSize, categoryId, brandId, query)}" +
                           $":{minPrice}:{maxPrice}:{inStock}:{sortBy}{CatalogProductHelpers.CacheVersion}";
            var cachedResponse = await cache.GetAsync<dynamic>(cacheKey);
            if (cachedResponse is not null) return Results.Ok(cachedResponse);

            var productsQuery = db.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.Brand)
                .AsQueryable();

            // Cùng MỘT vị từ với /products - không còn hai bản LIKE lệch nhau.
            productsQuery = productsQuery.ApplySearch(query);

            if (categoryId.HasValue)
                productsQuery = productsQuery.Where(p => p.CategoryId == categoryId.Value);

            if (brandId.HasValue)
                productsQuery = productsQuery.Where(p => p.BrandId == brandId.Value);

            if (minPrice.HasValue)
                productsQuery = productsQuery.Where(p => p.Price >= minPrice.Value);

            if (maxPrice.HasValue)
                productsQuery = productsQuery.Where(p => p.Price <= maxPrice.Value);

            if (inStock == true)
                productsQuery = productsQuery.Where(p => p.StockQuantity > 0);

            productsQuery = sortBy switch
            {
                "price_asc" => productsQuery.OrderBy(p => p.Price),
                "price_desc" => productsQuery.OrderByDescending(p => p.Price),
                "newest" => productsQuery.OrderByDescending(p => p.CreatedAt),
                "popular" => productsQuery.OrderByDescending(p => p.ViewCount),
                "name" => productsQuery.OrderBy(p => p.Name),
                _ => productsQuery.OrderByDescending(p => p.CreatedAt) // Default: newest first
            };

            var total = await productsQuery.CountAsync();
            var products = await productsQuery
                .Skip((validPage - 1) * validPageSize)
                .Take(validPageSize)
                .ToListAsync();

            var result = CatalogResponses.Paged(
                total, validPage, validPageSize,
                products.Select(CatalogResponses.ProductPayload));

            await cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5));

            return Results.Ok(result);
        });

        // ------------------------------------------------------------ related
        group.MapGet("/products/{productId:guid}/related", async (
            Guid productId, CatalogDbContext db, ICacheService cache, int limit = 8) =>
        {
            var cacheKey = CacheKeys.RelatedProductsKey(productId) + CatalogProductHelpers.CacheVersion;
            var cachedRelated = await cache.GetAsync<List<dynamic>>(cacheKey);
            if (cachedRelated != null) return Results.Ok(cachedRelated);

            var product = await db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == productId);
            if (product == null) return Results.NotFound();

            var relatedProducts = await db.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.Brand)
                .Where(p => p.Id != productId)
                .Where(p => p.CategoryId == product.CategoryId || p.BrandId == product.BrandId)
                .OrderByDescending(p => p.CategoryId == product.CategoryId) // Prioritize same category
                .ThenByDescending(p => p.CreatedAt)
                .Take(limit <= 0 ? 8 : Math.Min(limit, 50))
                .ToListAsync();

            // Flat shape — khớp Product DTO chuẩn để frontend dùng chung một kiểu.
            var payload = relatedProducts.Select(CatalogResponses.ProductPayload).ToList();
            await cache.SetAsync(cacheKey, payload, TimeSpan.FromMinutes(30));

            return Results.Ok(payload);
        });
    }
}
