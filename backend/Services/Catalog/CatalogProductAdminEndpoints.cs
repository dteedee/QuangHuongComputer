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
/// Đường GHI của sản phẩm (chỉ Admin). Ba sửa lỗi chính của W0-5 nằm ở đây:
///  1. `IgnoreQueryFilters()` để hàng đã gỡ bán vẫn sửa / bật lại được;
///  2. PUT là PARTIAL thật sự - không gửi SEO thì SEO không bị xoá;
///  3. `clearOldPrice` / `clearWarrantyMonths` tường minh cho việc xoá giá trị.
/// </summary>
public static class CatalogProductAdminEndpoints
{
    public static void MapCatalogProductAdminEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapPost("/products", async (
            CreateProductDto model,
            CatalogDbContext db,
            SystemConfig.Infrastructure.CustomFieldDbContext customFieldDb,
            ICacheService cache,
            HttpContext httpContext) =>
        {
            var attributesError = await SystemConfig.CustomFieldAttributeValidator.ValidateAsync(customFieldDb, "Product", model.Attributes);
            if (attributesError is not null)
                return Results.BadRequest(new { error = attributesError });

            var product = new Product(
                model.Name,
                model.Price,
                model.CostPrice,
                model.Description,
                model.CategoryId,
                model.BrandId,
                model.StockQuantity,
                model.Sku,
                model.OldPrice,
                model.Specifications,
                model.WarrantyInfo,
                stockLocations: model.StockLocations,
                imageUrl: model.ImageUrl,
                galleryImages: model.GalleryImages,
                warrantyMonths: model.WarrantyMonths
            );

            // Slug đã auto-sinh trong ctor Product; ở đây chỉ bảo đảm duy nhất trong DB.
            var uniqueCreateSlug = SlugGenerator.GenerateUnique(
                product.Name, s => db.Products.IgnoreQueryFilters().Any(p => p.Slug == s));
            if (!string.IsNullOrEmpty(uniqueCreateSlug)) product.SetSlug(uniqueCreateSlug);

            if (model.Attributes is not null) product.SetAttributes(model.Attributes);
            if (model.IsReturnExcluded.HasValue) product.UpdateWarrantyPolicy(isReturnExcluded: model.IsReturnExcluded);

            db.Products.Add(product);
            await db.SaveChangesAsync();

            await httpContext.LogAuditAsync("Create", "Product", product.Id.ToString(), $"Name: {product.Name}, Price: {product.Price}");
            await cache.RemoveByPatternAsync(CacheKeys.ProductsListPattern);

            return Results.Created($"/api/catalog/products/{product.Id}", CatalogResponses.ProductPayload(product));
        }).RequireAuthorization(Permissions.Catalog.Create);

        group.MapPut("/products/{id:guid}", async (
            Guid id,
            UpdateProductDto model,
            CatalogDbContext db,
            SystemConfig.Infrastructure.CustomFieldDbContext customFieldDb,
            ICacheService cache,
            HttpContext httpContext) =>
        {
            var product = await CatalogProductHelpers.LoadProductAsync(db, id, includeInactive: true, tracking: true);
            if (product == null)
                return Results.NotFound(new { Error = "Product not found" });

            if (model.Attributes is not null)
            {
                var attributesError = await SystemConfig.CustomFieldAttributeValidator.ValidateAsync(customFieldDb, "Product", model.Attributes);
                if (attributesError is not null)
                    return Results.BadRequest(new { error = attributesError });
                product.SetAttributes(model.Attributes);
            }

            var slugError = await ApplySlugAsync(db, product, model.Slug, id);
            if (slugError is not null) return slugError;

            if (model.Name != null || model.Description != null || model.Price.HasValue)
            {
                product.UpdateDetails(
                    model.Name ?? product.Name,
                    model.Description ?? product.Description,
                    model.Price ?? product.Price,
                    model.OldPrice,
                    model.Specifications,
                    model.WarrantyInfo,
                    model.StockLocations,
                    model.Weight,
                    model.Barcode
                );
            }
            else
            {
                // Các trường phụ vẫn phải áp dụng được khi body không gửi Name/Description/Price.
                if (model.OldPrice.HasValue) product.UpdatePrice(product.Price, model.OldPrice);
                if (model.Specifications != null) product.UpdateSpecifications(model.Specifications);
            }

            // `"oldPrice": null` không phân biệt được với "không gửi" -> cần cờ tường minh.
            if (model.ClearOldPrice) product.ClearOldPrice();

            if (model.ImageUrl != null || model.GalleryImages != null)
                product.UpdateImage(model.ImageUrl ?? product.ImageUrl ?? string.Empty, model.GalleryImages);

            if (model.CategoryId.HasValue) product.UpdateCategory(model.CategoryId.Value);
            if (model.BrandId.HasValue) product.UpdateBrand(model.BrandId.Value);
            if (model.StockQuantity.HasValue) product.UpdateStockQuantity(model.StockQuantity.Value);
            if (model.LowStockThreshold.HasValue) product.UpdateLowStockThreshold(model.LowStockThreshold.Value);
            if (model.CostPrice.HasValue) product.UpdateCostPrice(model.CostPrice.Value);
            if (!string.IsNullOrEmpty(model.Sku)) product.UpdateSku(model.Sku);

            // D08
            if (model.ClearWarrantyMonths) product.ClearWarrantyMonths();
            else if (model.WarrantyMonths.HasValue || model.IsReturnExcluded.HasValue)
                product.UpdateWarrantyPolicy(model.WarrantyMonths, model.IsReturnExcluded);

            // SEO PARTIAL: không gửi = giữ nguyên. Trước đây lưu sản phẩm từ một tab admin khác
            // (tab không gửi SEO) là xoá sạch MetaTitle/MetaDescription/MetaKeywords.
            product.UpdateSeo(model.MetaTitle, model.MetaDescription, model.MetaKeywords, model.CanonicalUrl);

            product.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            await httpContext.LogAuditAsync("Update", "Product", id.ToString(), $"Name: {product.Name}, Price: {product.Price}");
            await CatalogProductHelpers.InvalidateProductCachesAsync(cache, id);

            return Results.Ok(new
            {
                Message = "Product updated",
                Product = CatalogResponses.ProductPayload(product)
            });
        }).RequireAuthorization(Permissions.Catalog.Edit);

        group.MapDelete("/products/{id:guid}", async (Guid id, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
            await CatalogProductHelpers.SetProductActiveAsync(id, db, cache, httpContext, active: false))
            .RequireAuthorization(Permissions.Catalog.Delete);

        group.MapPost("/products/{id:guid}/activate", async (Guid id, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
            await CatalogProductHelpers.SetProductActiveAsync(id, db, cache, httpContext, active: true))
            .RequireAuthorization(Permissions.Catalog.Edit);

        group.MapPost("/products/{id:guid}/toggle-status", async (Guid id, CatalogDbContext db, ICacheService cache, HttpContext httpContext) =>
            await CatalogProductHelpers.SetProductActiveAsync(id, db, cache, httpContext, active: null))
            .RequireAuthorization(Permissions.Catalog.Edit);
    }

    /// <summary>Đổi slug sản phẩm có kiểm tra trùng (Slug là unique có filter ở DB).</summary>
    private static async Task<IResult?> ApplySlugAsync(CatalogDbContext db, Product product, string? requested, Guid id)
    {
        if (string.IsNullOrWhiteSpace(requested)) return null;

        var desired = SlugGenerator.Generate(requested);
        if (string.IsNullOrEmpty(desired))
            return Results.BadRequest(new { error = "Slug không hợp lệ" });

        if (desired == product.Slug) return null;

        if (await db.Products.IgnoreQueryFilters().AnyAsync(p => p.Slug == desired && p.Id != id))
            return Results.Conflict(new { error = $"Slug '{desired}' đã được dùng cho sản phẩm khác" });

        product.SetSlug(desired);
        return null;
    }
}
