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
/// Endpoint danh mục. `GET /categories` trả về DANH SÁCH PHẲNG kèm `parentId`
/// (frontend tự dựng cây mega menu - đúng như phase file cho phép).
/// </summary>
public static class CatalogCategoryEndpoints
{
    public static void MapCatalogCategoryEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapGet("/categories", async (CatalogDbContext db, ICacheService cache, HttpContext http, bool? includeInactive = null) =>
        {
            var showInactive = http.WantsInactive(includeInactive);
            var cacheKey = CacheKeys.CategoriesKey + CatalogTaxonomyHelpers.CategoriesCacheSuffix;

            if (!showInactive)
            {
                var cached = await cache.GetAsync<List<dynamic>>(cacheKey);
                if (cached is not null) return Results.Ok(cached);
            }

            var productCounts = await db.Products
                .GroupBy(p => p.CategoryId)
                .Select(g => new { CategoryId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CategoryId, x => x.Count);

            var source = showInactive ? db.Categories.IgnoreQueryFilters() : db.Categories;

            // Không còn "deduplicate by name": DB đã có UNIQUE (Name, IsActive) WHERE IsActive,
            // nên gộp theo tên chỉ có thể làm MẤT danh mục con hợp lệ của cây.
            var categoriesData = await source
                .AsNoTracking()
                .OrderBy(c => c.DisplayOrder)
                .ThenBy(c => c.Name)
                .ToListAsync();

            var categories = categoriesData
                .Select(c => CatalogResponses.CategoryPayload(c, productCounts.GetValueOrDefault(c.Id, 0)))
                .ToList();

            if (!showInactive)
                await cache.SetAsync(cacheKey, categories, TimeSpan.FromHours(1));

            return Results.Ok(categories);
        });

        group.MapGet("/categories/by-slug/{slug}", async (string slug, CatalogDbContext db) =>
        {
            var category = await db.Categories.AsNoTracking().FirstOrDefaultAsync(c => c.Slug == slug);
            if (category is null) return Results.NotFound();

            var productCount = await db.Products.CountAsync(p => p.CategoryId == category.Id);
            return Results.Ok(CatalogResponses.CategoryPayload(category, productCount));
        });

        group.MapGet("/categories/{id:guid}", async (Guid id, CatalogDbContext db, HttpContext http, bool? includeInactive = null) =>
        {
            var source = http.WantsInactive(includeInactive) ? db.Categories.IgnoreQueryFilters() : db.Categories;
            var category = await source.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
            if (category is null) return Results.NotFound();

            var productCount = await db.Products.CountAsync(p => p.CategoryId == id);
            return Results.Ok(CatalogResponses.CategoryPayload(category, productCount));
        });

        group.MapPost("/categories", async (CreateCategoryDto model, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            if (model.ParentId.HasValue &&
                !await db.Categories.IgnoreQueryFilters().AnyAsync(c => c.Id == model.ParentId.Value))
                return Results.BadRequest(new { error = "Danh mục cha không tồn tại" });

            var category = new Category(model.Name, model.Description, model.ParentId);

            // Slug sinh trong ctor; ở đây chỉ bảo đảm tính duy nhất trong DB.
            var unique = SlugGenerator.GenerateUnique(
                model.Name, s => db.Categories.IgnoreQueryFilters().Any(c => c.Slug == s));
            if (!string.IsNullOrEmpty(unique)) category.Slug = unique;

            category.UpdatePresentation(
                imageUrl: model.ImageUrl, icon: model.Icon, displayOrder: model.DisplayOrder,
                metaTitle: model.MetaTitle, metaDescription: model.MetaDescription);
            category.UpdatePolicy(model.VatRate, model.VatReductionEligible, model.IsSerialTracked);

            db.Categories.Add(category);
            await db.SaveChangesAsync();

            await httpContext.LogAuditAsync("Create", "Category", category.Id.ToString(), $"Name: {category.Name}");
            await cache.RemoveByPatternAsync(CacheKeys.CategoriesPattern);

            return Results.Created($"/api/catalog/categories/{category.Id}", CatalogResponses.CategoryPayload(category, 0));
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        group.MapPut("/categories/{id:guid}", async (Guid id, UpdateCategoryDto model, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var category = await db.Categories.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == id);
            if (category == null)
                return Results.NotFound(new { Error = "Category not found" });

            if (model.ParentId.HasValue && !model.ClearParent)
            {
                if (model.ParentId.Value == id)
                    return Results.BadRequest(new { error = "Danh mục không thể là cha của chính nó" });
                if (!await db.Categories.IgnoreQueryFilters().AnyAsync(c => c.Id == model.ParentId.Value))
                    return Results.BadRequest(new { error = "Danh mục cha không tồn tại" });
                if (await CreatesCycleAsync(db, id, model.ParentId.Value))
                    return Results.BadRequest(new { error = "Gán danh mục cha như vậy sẽ tạo vòng lặp trong cây" });
            }

            category.UpdateDetails(model.Name, model.Description);

            var slugError = await ApplySlugAsync(db, category, model.Slug, id);
            if (slugError is not null) return slugError;

            category.UpdatePresentation(
                parentId: model.ParentId, clearParent: model.ClearParent,
                imageUrl: model.ImageUrl, icon: model.Icon, displayOrder: model.DisplayOrder,
                metaTitle: model.MetaTitle, metaDescription: model.MetaDescription);
            category.UpdatePolicy(model.VatRate, model.VatReductionEligible, model.IsSerialTracked);

            if (model.IsActive.HasValue)
            {
                if (model.IsActive.Value) category.Activate();
                else
                {
                    var blocked = await CatalogTaxonomyHelpers.BlockIfInUseAsync(db, categoryId: id, brandId: null);
                    if (blocked is not null) return blocked;
                    category.Deactivate(CatalogTaxonomyHelpers.CurrentUser(httpContext));
                }
            }

            await db.SaveChangesAsync();

            await httpContext.LogAuditAsync("Update", "Category", id.ToString(), $"Name: {category.Name}");
            await cache.RemoveByPatternAsync(CacheKeys.CategoriesPattern);
            await cache.RemoveByPatternAsync(CacheKeys.ProductsListPattern);

            var count = await db.Products.CountAsync(p => p.CategoryId == id);
            return Results.Ok(new { Message = "Category updated", Category = CatalogResponses.CategoryPayload(category, count) });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        group.MapDelete("/categories/{id:guid}", async (Guid id, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var category = await db.Categories.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == id);
            if (category == null)
                return Results.NotFound(new { Error = "Category not found" });

            // KHÔNG còn cascade deactivate - xem chú thích ở BlockIfInUseAsync.
            var blocked = await CatalogTaxonomyHelpers.BlockIfInUseAsync(db, categoryId: id, brandId: null);
            if (blocked is not null) return blocked;

            // Còn danh mục con đang hoạt động thì cũng chặn (FK Restrict + menu sẽ mồ côi).
            var childCount = await db.Categories.CountAsync(c => c.ParentId == id);
            if (childCount > 0)
                return Results.Conflict(new
                {
                    error = $"Danh mục còn {childCount} danh mục con đang hoạt động. Hãy chuyển hoặc gỡ chúng trước.",
                    childCategoryCount = childCount
                });

            category.Deactivate(CatalogTaxonomyHelpers.CurrentUser(httpContext));
            await db.SaveChangesAsync();

            await httpContext.LogAuditAsync("Deactivate", "Category", id.ToString(), $"Name: {category.Name}");
            await cache.RemoveByPatternAsync(CacheKeys.CategoriesPattern);
            await cache.RemoveByPatternAsync(CacheKeys.ProductsPattern);

            return Results.Ok(new { Message = "Category deactivated" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));

        group.MapPost("/categories/{id:guid}/activate", async (Guid id, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
        {
            var category = await db.Categories.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == id);
            if (category == null)
                return Results.NotFound(new { Error = "Category not found" });

            category.Activate();
            await db.SaveChangesAsync();

            await httpContext.LogAuditAsync("Activate", "Category", id.ToString(), $"Name: {category.Name}");
            await cache.RemoveByPatternAsync(CacheKeys.CategoriesPattern);
            await cache.RemoveByPatternAsync(CacheKeys.ProductsPattern);

            return Results.Ok(new { Message = "Category activated" });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));
    }

    /// <summary>Đổi slug danh mục có kiểm tra trùng. Trả IResult lỗi, hoặc null nếu OK.</summary>
    private static async Task<IResult?> ApplySlugAsync(CatalogDbContext db, Category category, string? requested, Guid id)
    {
        // Không gửi slug: chỉ vá khi đang rỗng (dữ liệu cũ), tuyệt đối không tự đổi slug đang chạy.
        if (string.IsNullOrWhiteSpace(requested))
        {
            if (string.IsNullOrWhiteSpace(category.Slug))
            {
                var generated = SlugGenerator.GenerateUnique(
                    category.Name, s => db.Categories.IgnoreQueryFilters().Any(c => c.Slug == s && c.Id != id));
                if (!string.IsNullOrEmpty(generated)) category.Slug = generated;
            }
            return null;
        }

        var desired = SlugGenerator.Generate(requested);
        if (string.IsNullOrEmpty(desired))
            return Results.BadRequest(new { error = "Slug không hợp lệ" });

        if (desired == category.Slug) return null;

        if (await db.Categories.IgnoreQueryFilters().AnyAsync(c => c.Slug == desired && c.Id != id))
            return Results.Conflict(new { error = $"Slug '{desired}' đã được dùng cho danh mục khác" });

        category.SetSlug(desired);
        return null;
    }

    /// <summary>Phát hiện vòng lặp khi gán cha mới (A -&gt; B -&gt; A). Leo tối đa 32 tầng.</summary>
    private static async Task<bool> CreatesCycleAsync(CatalogDbContext db, Guid categoryId, Guid newParentId)
    {
        var cursor = (Guid?)newParentId;
        for (var depth = 0; depth < 32 && cursor.HasValue; depth++)
        {
            if (cursor.Value == categoryId) return true;
            var current = cursor.Value;
            cursor = await db.Categories.IgnoreQueryFilters()
                .Where(c => c.Id == current)
                .Select(c => c.ParentId)
                .FirstOrDefaultAsync();
        }
        return false;
    }
}
