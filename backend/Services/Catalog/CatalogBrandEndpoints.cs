using BuildingBlocks.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;
using Catalog.Domain;
using BuildingBlocks.Caching;
using BuildingBlocks.Endpoints;

namespace Catalog;

/// <summary>
/// Endpoint thương hiệu. W0-5 thêm `slug` (URL /thuong-hieu/&lt;slug&gt;), `logoUrl`
/// (mega menu), `website`, `displayOrder`, và chặn xoá khi còn hàng đang bán.
/// </summary>
public static class CatalogBrandEndpoints
{
    public static void MapCatalogBrandEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapGet("/brands", async (CatalogDbContext db, ICacheService cache, HttpContext http, bool? includeInactive = null) =>
        {
            var showInactive = http.WantsInactive(includeInactive);
            var cacheKey = CacheKeys.BrandsKey + CatalogTaxonomyHelpers.BrandsCacheSuffix;

            if (!showInactive)
            {
                var cached = await cache.GetAsync<List<dynamic>>(cacheKey);
                if (cached is not null) return Results.Ok(cached);
            }

            var productCounts = await db.Products
                .GroupBy(p => p.BrandId)
                .Select(g => new { BrandId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.BrandId, x => x.Count);

            var source = showInactive ? db.Brands.IgnoreQueryFilters() : db.Brands;

            // Bỏ "deduplicate by name" như ở danh mục: UNIQUE (Name, IsActive) đã lo việc đó.
            var brandsData = await source
                .AsNoTracking()
                .OrderBy(b => b.DisplayOrder)
                .ThenBy(b => b.Name)
                .ToListAsync();

            var brands = brandsData
                .Select(b => CatalogResponses.BrandPayload(b, productCounts.GetValueOrDefault(b.Id, 0)))
                .ToList();

            if (!showInactive)
                await cache.SetAsync(cacheKey, brands, TimeSpan.FromHours(1));

            return Results.Ok(brands);
        });

        group.MapGet("/brands/by-slug/{slug}", async (string slug, CatalogDbContext db) =>
        {
            var brand = await db.Brands.AsNoTracking().FirstOrDefaultAsync(b => b.Slug == slug);
            if (brand is null) return Results.NotFound();

            var productCount = await db.Products.CountAsync(p => p.BrandId == brand.Id);
            return Results.Ok(CatalogResponses.BrandPayload(brand, productCount));
        });

        group.MapGet("/brands/{id:guid}", async (Guid id, CatalogDbContext db, HttpContext http, bool? includeInactive = null) =>
        {
            var source = http.WantsInactive(includeInactive) ? db.Brands.IgnoreQueryFilters() : db.Brands;
            var brand = await source.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id);
            if (brand is null) return Results.NotFound();

            var productCount = await db.Products.CountAsync(p => p.BrandId == id);
            return Results.Ok(CatalogResponses.BrandPayload(brand, productCount));
        });

        group.MapPost("/brands", async (CreateBrandDto model, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var brand = new Brand(model.Name, model.Description);

            var unique = SlugGenerator.GenerateUnique(
                model.Name, s => db.Brands.IgnoreQueryFilters().Any(b => b.Slug == s));
            if (!string.IsNullOrEmpty(unique)) brand.SetSlug(unique);

            brand.UpdatePresentation(model.LogoUrl, model.Website, model.DisplayOrder);

            db.Brands.Add(brand);
            await db.SaveChangesAsync();

            await httpContext.LogAuditAsync("Create", "Brand", brand.Id.ToString(), $"Name: {brand.Name}");
            await cache.RemoveByPatternAsync(CacheKeys.BrandsPattern);

            return Results.Created($"/api/catalog/brands/{brand.Id}", CatalogResponses.BrandPayload(brand, 0));
        }).RequireAuthorization(Permissions.Catalog.Create);

        group.MapPut("/brands/{id:guid}", async (Guid id, UpdateBrandDto model, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var brand = await db.Brands.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.Id == id);
            if (brand == null)
                return Results.NotFound(new { Error = "Brand not found" });

            brand.UpdateDetails(model.Name, model.Description);

            var slugError = await ApplySlugAsync(db, brand, model.Slug, id);
            if (slugError is not null) return slugError;

            brand.UpdatePresentation(model.LogoUrl, model.Website, model.DisplayOrder);

            if (model.IsActive.HasValue)
            {
                if (model.IsActive.Value) brand.Activate();
                else
                {
                    var blocked = await CatalogTaxonomyHelpers.BlockIfInUseAsync(db, categoryId: null, brandId: id);
                    if (blocked is not null) return blocked;
                    brand.Deactivate(CatalogTaxonomyHelpers.CurrentUser(httpContext));
                }
            }

            await db.SaveChangesAsync();

            await httpContext.LogAuditAsync("Update", "Brand", id.ToString(), $"Name: {brand.Name}");
            await cache.RemoveByPatternAsync(CacheKeys.BrandsPattern);
            await cache.RemoveByPatternAsync(CacheKeys.ProductsListPattern);

            var count = await db.Products.CountAsync(p => p.BrandId == id);
            return Results.Ok(new { Message = "Brand updated", Brand = CatalogResponses.BrandPayload(brand, count) });
        }).RequireAuthorization(Permissions.Catalog.Edit);

        group.MapDelete("/brands/{id:guid}", async (Guid id, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var brand = await db.Brands.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.Id == id);
            if (brand == null)
                return Results.NotFound(new { Error = "Brand not found" });

            // KHÔNG còn cascade deactivate mọi sản phẩm của hãng.
            var blocked = await CatalogTaxonomyHelpers.BlockIfInUseAsync(db, categoryId: null, brandId: id);
            if (blocked is not null) return blocked;

            brand.Deactivate(CatalogTaxonomyHelpers.CurrentUser(httpContext));
            await db.SaveChangesAsync();

            await httpContext.LogAuditAsync("Deactivate", "Brand", id.ToString(), $"Name: {brand.Name}");
            await cache.RemoveByPatternAsync(CacheKeys.BrandsPattern);
            await cache.RemoveByPatternAsync(CacheKeys.ProductsPattern);

            return Results.Ok(new { Message = "Brand deactivated" });
        }).RequireAuthorization(Permissions.Catalog.Delete);

        group.MapPost("/brands/{id:guid}/activate", async (Guid id, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var brand = await db.Brands.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.Id == id);
            if (brand == null)
                return Results.NotFound(new { Error = "Brand not found" });

            brand.Activate();
            await db.SaveChangesAsync();

            await httpContext.LogAuditAsync("Activate", "Brand", id.ToString(), $"Name: {brand.Name}");
            await cache.RemoveByPatternAsync(CacheKeys.BrandsPattern);
            await cache.RemoveByPatternAsync(CacheKeys.ProductsPattern);

            return Results.Ok(new { Message = "Brand activated" });
        }).RequireAuthorization(Permissions.Catalog.Edit);
    }

    /// <summary>Đổi slug thương hiệu có kiểm tra trùng (uq_brands_slug là unique có filter).</summary>
    private static async Task<IResult?> ApplySlugAsync(CatalogDbContext db, Brand brand, string? requested, Guid id)
    {
        if (string.IsNullOrWhiteSpace(requested)) return null;

        var desired = SlugGenerator.Generate(requested);
        if (string.IsNullOrEmpty(desired))
            return Results.BadRequest(new { error = "Slug không hợp lệ" });

        if (desired == brand.Slug) return null;

        if (await db.Brands.IgnoreQueryFilters().AnyAsync(b => b.Slug == desired && b.Id != id))
            return Results.Conflict(new { error = $"Slug '{desired}' đã được dùng cho thương hiệu khác" });

        brand.SetSlug(desired);
        return null;
    }
}
