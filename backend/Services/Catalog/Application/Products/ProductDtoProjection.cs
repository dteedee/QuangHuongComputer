using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Application.Products;

/// <summary>
/// Ánh xạ Product (+ media/spec/variant khi được yêu cầu) sang <see cref="ProductDto"/>.
/// Xây group/spec ở <see cref="ProductSpecGroupBuilder"/>, biến thể ở
/// <see cref="ProductVariantDtoBuilder"/> - giữ file này dưới 200 dòng.
/// </summary>
public static class ProductDtoProjection
{
    [Flags]
    public enum Include
    {
        None = 0,
        Media = 1,
        Specs = 2,
        Variants = 4,
    }

    /// <summary>Parse `?include=media,specs,variants` (thứ tự tự do, phân tách bởi dấu phẩy).</summary>
    public static Include ParseInclude(string? include)
    {
        if (string.IsNullOrWhiteSpace(include)) return Include.None;
        var result = Include.None;
        foreach (var part in include.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            result |= part.ToLowerInvariant() switch
            {
                "media" or "medias" => Include.Media,
                "specs" or "specifications" => Include.Specs,
                "variants" => Include.Variants,
                _ => Include.None,
            };
        }
        return result;
    }

    /// <summary>
    /// Ảnh chính (url + thumbnail) cho một lô sản phẩm - MỘT truy vấn cho cả trang danh sách,
    /// không N+1. D02: list/search chỉ cần `thumbnailUrl`, không cần tải cả mảng media.
    /// </summary>
    public static async Task<Dictionary<Guid, (string Url, string? Thumb)>> LoadPrimaryMediaAsync(
        CatalogDbContext db, IReadOnlyCollection<Guid> productIds, CancellationToken ct = default)
    {
        if (productIds.Count == 0) return new();
        var rows = await db.ProductMedias.AsNoTracking()
            .Where(m => productIds.Contains(m.ProductId) && m.IsPrimary)
            .Select(m => new { m.ProductId, m.Url, m.ThumbnailUrl })
            .ToListAsync(ct);
        return rows.ToDictionary(r => r.ProductId, r => (r.Url, r.ThumbnailUrl));
    }

    /// <summary>Chiếu 1 sản phẩm sang DTO. Dùng cho list/search/related (không include).</summary>
    public static ProductDto ToDto(
        Product p,
        string? thumbnailUrl,
        IReadOnlyList<ProductMediaDto>? medias = null,
        IReadOnlyList<SpecGroupDto>? specGroups = null,
        IReadOnlyList<ProductVariantDto>? variants = null) => new(
        Id: p.Id, Name: p.Name, Sku: p.Sku, Slug: p.Slug,
        Price: p.Price, OldPrice: p.OldPrice, Description: p.Description,
        Specifications: p.Specifications, WarrantyInfo: p.WarrantyInfo, WarrantyMonths: p.WarrantyMonths,
        IsReturnExcluded: p.IsReturnExcluded, UnitName: p.UnitName,
        StockLocations: p.StockLocations, StockQuantity: p.StockQuantity, Status: p.Status,
        ViewCount: p.ViewCount, SoldCount: p.SoldCount, AverageRating: p.AverageRating, ReviewCount: p.ReviewCount,
        ImageUrl: p.ImageUrl, ThumbnailUrl: thumbnailUrl ?? p.ImageUrl,
        LowStockThreshold: p.LowStockThreshold, IsActive: p.IsActive, PublishedAt: p.PublishedAt,
        CreatedAt: p.CreatedAt, UpdatedAt: p.UpdatedAt, CreatedBy: p.CreatedBy, UpdatedBy: p.UpdatedBy,
        CategoryId: p.CategoryId.ToString(), CategoryName: p.Category?.Name, CategorySlug: p.Category?.Slug,
        BrandId: p.BrandId.ToString(), BrandName: p.Brand?.Name, BrandSlug: p.Brand?.Slug,
        GalleryImages: p.GalleryImages, Attributes: p.Attributes,
        MetaTitle: p.MetaTitle, MetaDescription: p.MetaDescription, MetaKeywords: p.MetaKeywords, CanonicalUrl: p.CanonicalUrl,
        Medias: medias, SpecGroups: specGroups, Variants: variants);

    /// <summary>
    /// Chiếu sản phẩm chi tiết theo `include=`. Bước 2 phase file: "medias ordered by SortOrder,
    /// spec values grouped by SpecificationGroup with display order, variants with their options".
    /// KHÔNG bao giờ chạm navigation riêng của Product (`_medias`/`_variants`/`_specValues`) -
    /// luôn query thẳng DbSet con để tránh lớp lỗi "backing field chưa được nạp" (W1-6 đã gặp,
    /// xem CatalogMediaEndpoints.cs).
    /// </summary>
    public static async Task<ProductDto> BuildDetailAsync(
        CatalogDbContext db, Product p, Include includes, CancellationToken ct = default)
    {
        IReadOnlyList<ProductMediaDto>? mediaDtos = null;
        string? thumbnailUrl;

        var primaryMedia = await db.ProductMedias.AsNoTracking()
            .Where(m => m.ProductId == p.Id && m.IsPrimary)
            .Select(m => new { m.Url, m.ThumbnailUrl })
            .FirstOrDefaultAsync(ct);
        thumbnailUrl = primaryMedia?.ThumbnailUrl ?? primaryMedia?.Url;

        if (includes.HasFlag(Include.Media))
        {
            var rows = await db.ProductMedias.AsNoTracking()
                .Where(m => m.ProductId == p.Id)
                .OrderBy(m => m.SortOrder)
                .ToListAsync(ct);
            mediaDtos = rows
                .Select(m => new ProductMediaDto(m.Id, m.Url, m.ThumbnailUrl, m.AltText, m.IsPrimary, m.SortOrder, m.Type))
                .ToList();
        }

        var specGroups = includes.HasFlag(Include.Specs)
            ? await ProductSpecGroupBuilder.BuildAsync(db, p, ct)
            : null;

        var variants = includes.HasFlag(Include.Variants)
            ? await ProductVariantDtoBuilder.BuildAsync(db, p.Id, ct)
            : null;

        return ToDto(p, thumbnailUrl, mediaDtos, specGroups, variants);
    }
}
