using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;
using Catalog.Domain;
using Catalog.Application.Products;
using Catalog.Application.Search;
using Catalog.Application.Specifications;
using BuildingBlocks.Database;
using BuildingBlocks.Caching;

namespace Catalog;

/// <summary>
/// Tìm kiếm nâng cao (+ lọc thông số + facet counts, step 3 phase file) và sản phẩm liên quan.
/// Tách khỏi `CatalogProductQueryEndpoints.cs` để giữ mỗi file dưới 200 dòng.
/// </summary>
public static class CatalogProductSearchEndpoints
{
    public static void MapCatalogProductSearchEndpoints(this IEndpointRouteBuilder group)
    {
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
            HttpContext http,
            int page = 1,
            int pageSize = 20,
            CancellationToken ct = default) =>
        {
            var (validPage, validPageSize) = QueryOptimizationExtensions.ValidatePaginationParams(page, pageSize);
            var specFilters = ParseSpecFilters(http.Request.Query);

            // Step 3: filter thông số đi vào khoá cache (thứ tự key/value cố định để khoá ổn định).
            var specKeyPart = specFilters.Count == 0
                ? string.Empty
                : ":spec:" + string.Join(",", specFilters.OrderBy(kv => kv.Key, StringComparer.Ordinal).Select(kv => $"{kv.Key}={kv.Value}"));
            var cacheKey = $"{CacheKeys.ProductsListKey(validPage, validPageSize, categoryId, brandId, query)}" +
                           $":{minPrice}:{maxPrice}:{inStock}:{sortBy}{specKeyPart}{CatalogProductHelpers.CacheVersion}";
            var cachedResponse = await cache.GetAsync<object>(cacheKey);
            if (cachedResponse is not null) return Results.Ok(cachedResponse);

            // Công khai: chỉ hàng đã đăng web (D10). `/products/search` không có tham số
            // includeInactive - đây luôn là mặt tìm kiếm của khách.
            var productsQuery = db.Products.WherePublished()
                .AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.Brand)
                .AsQueryable();

            productsQuery = productsQuery.ApplySearch(query);
            if (categoryId.HasValue) productsQuery = productsQuery.Where(p => p.CategoryId == categoryId.Value);
            if (brandId.HasValue) productsQuery = productsQuery.Where(p => p.BrandId == brandId.Value);
            if (minPrice.HasValue) productsQuery = productsQuery.Where(p => p.Price >= minPrice.Value);
            if (maxPrice.HasValue) productsQuery = productsQuery.Where(p => p.Price <= maxPrice.Value);
            if (inStock == true) productsQuery = productsQuery.Where(p => p.StockQuantity > 0);

            // Step 3: SpecificationFilterBuilder đã unit-tested sẵn - chỉ wiring, không viết lại.
            productsQuery = SpecificationFilterBuilder.ApplyFilters(productsQuery, db, specFilters);

            productsQuery = sortBy switch
            {
                "price_asc" => productsQuery.OrderBy(p => p.Price),
                "price_desc" => productsQuery.OrderByDescending(p => p.Price),
                "newest" => productsQuery.OrderByDescending(p => p.CreatedAt),
                "popular" => productsQuery.OrderByDescending(p => p.ViewCount),
                "name" => productsQuery.OrderBy(p => p.Name),
                _ => productsQuery.OrderByDescending(p => p.CreatedAt)
            };

            var total = await productsQuery.CountAsync(ct);

            // Facet counts cho TOÀN BỘ tập đã lọc (trước paging) - step 3 + success criteria.
            var facets = await ComputeFacetsAsync(db, productsQuery, categoryId, ct);

            var products = await productsQuery
                .Skip((validPage - 1) * validPageSize)
                .Take(validPageSize)
                .ToListAsync(ct);

            var thumbs = await ProductDtoProjection.LoadPrimaryMediaAsync(db, products.Select(p => p.Id).ToList(), ct);
            var result = CatalogResponses.Paged(
                total, validPage, validPageSize,
                products.Select(p => ProductDtoProjection.ToDto(p, thumbs.GetValueOrDefault(p.Id).Thumb ?? thumbs.GetValueOrDefault(p.Id).Url)),
                facets);

            await cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5));
            return Results.Ok(result);
        });

        // ------------------------------------------------------------ related
        group.MapGet("/products/{productId:guid}/related", async (
            Guid productId, CatalogDbContext db, ICacheService cache, int limit = 8, CancellationToken ct = default) =>
        {
            var cacheKey = CacheKeys.RelatedProductsKey(productId) + CatalogProductHelpers.CacheVersion;
            var cachedRelated = await cache.GetAsync<List<ProductDto>>(cacheKey);
            if (cachedRelated != null) return Results.Ok(cachedRelated);

            var product = await db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == productId, ct);
            if (product == null) return Results.NotFound();

            var relatedProducts = await db.Products.WherePublished()
                .AsNoTracking()
                .Include(p => p.Category)
                .Include(p => p.Brand)
                .Where(p => p.Id != productId)
                .Where(p => p.CategoryId == product.CategoryId || p.BrandId == product.BrandId)
                .OrderByDescending(p => p.CategoryId == product.CategoryId)
                .ThenByDescending(p => p.CreatedAt)
                .Take(limit <= 0 ? 8 : Math.Min(limit, 50))
                .ToListAsync(ct);

            var thumbs = await ProductDtoProjection.LoadPrimaryMediaAsync(db, relatedProducts.Select(p => p.Id).ToList(), ct);
            var payload = relatedProducts
                .Select(p => ProductDtoProjection.ToDto(p, thumbs.GetValueOrDefault(p.Id).Thumb ?? thumbs.GetValueOrDefault(p.Id).Url))
                .ToList();
            await cache.SetAsync(cacheKey, payload, TimeSpan.FromMinutes(30));

            return Results.Ok(payload);
        });
    }

    /// <summary>`spec[cpu_socket]=AM5` -> {"cpu_socket": "AM5"} (cú pháp giá trị: xem SpecificationFilterBuilder).</summary>
    private static IReadOnlyDictionary<string, string> ParseSpecFilters(IQueryCollection query)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var kv in query)
        {
            if (kv.Key.Length <= 6 || !kv.Key.StartsWith("spec[", StringComparison.OrdinalIgnoreCase) || !kv.Key.EndsWith(']'))
                continue;
            var key = kv.Key[5..^1];
            var value = kv.Value.ToString();
            if (!string.IsNullOrWhiteSpace(key) && !string.IsNullOrWhiteSpace(value))
                result[key] = value;
        }
        return result;
    }

    /// <summary>Cùng khối logic tính facet của `/categories/{id}/filters` nhưng scope theo tập đã lọc.</summary>
    private static async Task<List<object>> ComputeFacetsAsync(
        CatalogDbContext db, IQueryable<Product> filteredProducts, Guid? categoryId, CancellationToken ct)
    {
        var attributesQuery = db.SpecificationAttributes.AsNoTracking().Where(a => a.IsFilterable);
        if (categoryId.HasValue)
            attributesQuery = attributesQuery.Where(a => db.SpecificationGroups
                .Any(g => g.Id == a.GroupId && (g.CategoryId == null || g.CategoryId == categoryId)));
        var attributes = await attributesQuery.OrderBy(a => a.SortOrder).ToListAsync(ct);
        if (attributes.Count == 0) return new();

        var facets = new List<object>();
        foreach (var attr in attributes)
        {
            var valuesQuery = db.ProductSpecificationValues.AsNoTracking()
                .Where(v => v.AttributeId == attr.Id && filteredProducts.Any(p => p.Id == v.ProductId));

            object valuesPayload = attr.DataType switch
            {
                SpecDataType.Number => await valuesQuery.Where(v => v.ValueNumber != null)
                    .GroupBy(v => v.ValueNumber).Select(g => new { value = g.Key, count = g.Count() })
                    .OrderBy(x => x.value).ToListAsync(ct),
                SpecDataType.Boolean => await valuesQuery.Where(v => v.ValueBool != null)
                    .GroupBy(v => v.ValueBool).Select(g => new { value = (object?)g.Key, count = g.Count() })
                    .ToListAsync(ct),
                SpecDataType.Enum => await valuesQuery.Where(v => v.ValueEnum != null)
                    .GroupBy(v => v.ValueEnum).Select(g => new { value = (object?)g.Key, count = g.Count() })
                    .OrderBy(x => (string)x.value!).ToListAsync(ct),
                _ => await valuesQuery.Where(v => v.ValueText != null)
                    .GroupBy(v => v.ValueText).Select(g => new { value = (object?)g.Key, count = g.Count() })
                    .OrderBy(x => (string)x.value!).ToListAsync(ct),
            };

            facets.Add(new
            {
                attributeId = attr.Id,
                attributeKey = attr.Key,
                attributeName = attr.Name,
                unit = attr.Unit,
                dataType = attr.DataType.ToString(),
                values = valuesPayload,
            });
        }
        return facets;
    }
}
