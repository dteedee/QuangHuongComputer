using Catalog.Domain;

namespace Catalog;

// ---------------------------------------------------------------- request DTOs

public record CreateProductDto(
    string Name,
    string Description,
    decimal Price,
    decimal CostPrice,
    Guid CategoryId,
    Guid BrandId,
    int StockQuantity,
    string? Sku = null,
    decimal? OldPrice = null,
    string? Specifications = null,
    string? WarrantyInfo = null,
    string? StockLocations = null,
    string? ImageUrl = null,
    string? GalleryImages = null,
    string? Attributes = null,
    int? WarrantyMonths = null,
    bool? IsReturnExcluded = null);

/// <summary>
/// PARTIAL update: `null` = không đụng tới trường đó. Muốn xoá thì dùng cờ `Clear*`
/// tường minh (JSON không phân biệt được "vắng mặt" với "null" trên kiểu nullable).
/// </summary>
public record UpdateProductDto(
    string? Name = null,
    string? Description = null,
    decimal? Price = null,
    decimal? OldPrice = null,
    decimal? CostPrice = null,
    Guid? CategoryId = null,
    Guid? BrandId = null,
    int? StockQuantity = null,
    int? LowStockThreshold = null,
    string? Sku = null,
    string? Barcode = null,
    decimal? Weight = null,
    string? Specifications = null,
    string? WarrantyInfo = null,
    string? StockLocations = null,
    string? ImageUrl = null,
    string? GalleryImages = null,
    string? MetaTitle = null,
    string? MetaDescription = null,
    string? MetaKeywords = null,
    string? CanonicalUrl = null,
    string? Attributes = null,
    string? Slug = null,
    int? WarrantyMonths = null,
    bool? IsReturnExcluded = null,
    // ClearOldPrice: xoá giá gạch ngang - không diễn đạt được bằng `OldPrice = null`.
    bool ClearOldPrice = false,
    // ClearWarrantyMonths: xoá bảo hành riêng, quay về chính sách của ngành hàng.
    bool ClearWarrantyMonths = false);

public record CreateCategoryDto(
    string Name,
    string Description,
    Guid? ParentId = null,
    string? ImageUrl = null,
    string? Icon = null,
    int? DisplayOrder = null,
    string? MetaTitle = null,
    string? MetaDescription = null,
    decimal? VatRate = null,
    bool? VatReductionEligible = null,
    bool? IsSerialTracked = null);

public record UpdateCategoryDto(
    string Name,
    string Description,
    bool? IsActive = null,
    Guid? ParentId = null,
    bool ClearParent = false,
    string? ImageUrl = null,
    string? Icon = null,
    int? DisplayOrder = null,
    string? MetaTitle = null,
    string? MetaDescription = null,
    decimal? VatRate = null,
    bool? VatReductionEligible = null,
    bool? IsSerialTracked = null,
    string? Slug = null);

public record CreateBrandDto(
    string Name,
    string Description,
    string? LogoUrl = null,
    string? Website = null,
    int? DisplayOrder = null);

public record UpdateBrandDto(
    string Name,
    string Description,
    bool? IsActive = null,
    string? LogoUrl = null,
    string? Website = null,
    int? DisplayOrder = null,
    string? Slug = null);

public record CreateProductReviewDto(int Rating, string Comment, string? Title = null, string? ImageUrls = null, string? VideoUrl = null);

// ---------------------------------------------------------------- response mappers

/// <summary>
/// MỘT chỗ duy nhất định nghĩa hình dạng JSON của sản phẩm. Trước đây bốn endpoint
/// (`/products`, `/products/{id}`, `/products/by-slug/{slug}`, `/products/search`)
/// mỗi chỗ chép lại một khối anonymous type 30 dòng và đã bắt đầu lệch nhau.
/// </summary>
public static class CatalogResponses
{
    public static object ProductPayload(Product p) => new
    {
        id = p.Id,
        name = p.Name,
        sku = p.Sku,
        price = p.Price,
        oldPrice = p.OldPrice,
        description = p.Description,
        specifications = p.Specifications,
        warrantyInfo = p.WarrantyInfo,
        warrantyMonths = p.WarrantyMonths,
        isReturnExcluded = p.IsReturnExcluded,
        stockLocations = p.StockLocations,
        stockQuantity = p.StockQuantity,
        status = p.Status,
        viewCount = p.ViewCount,
        soldCount = p.SoldCount,
        averageRating = p.AverageRating,
        reviewCount = p.ReviewCount,
        imageUrl = p.ImageUrl,
        lowStockThreshold = p.LowStockThreshold,
        isActive = p.IsActive,
        createdAt = p.CreatedAt,
        updatedAt = p.UpdatedAt,
        createdBy = p.CreatedBy,
        updatedBy = p.UpdatedBy,
        categoryId = p.CategoryId.ToString(),
        categoryName = p.Category?.Name,
        categorySlug = p.Category?.Slug,
        brandId = p.BrandId.ToString(),
        brandName = p.Brand?.Name,
        brandSlug = p.Brand?.Slug,
        galleryImages = p.GalleryImages,
        attributes = p.Attributes,
        slug = p.Slug,
        // SEO nằm trong payload để admin nhìn thấy được - đây cũng là bằng chứng
        // cho việc partial update không còn xoá SEO.
        metaTitle = p.MetaTitle,
        metaDescription = p.MetaDescription,
        metaKeywords = p.MetaKeywords,
        canonicalUrl = p.CanonicalUrl
    };

    public static object CategoryPayload(Category c, int productCount) => new
    {
        id = c.Id,
        name = c.Name,
        description = c.Description,
        slug = c.Slug,
        parentId = c.ParentId,
        imageUrl = c.ImageUrl,
        icon = c.Icon,
        displayOrder = c.DisplayOrder,
        metaTitle = c.MetaTitle,
        metaDescription = c.MetaDescription,
        vatRate = c.VatRate,
        vatReductionEligible = c.VatReductionEligible,
        isSerialTracked = c.IsSerialTracked,
        isActive = c.IsActive,
        createdAt = c.CreatedAt,
        updatedAt = c.UpdatedAt,
        productCount
    };

    public static object BrandPayload(Brand b, int productCount) => new
    {
        id = b.Id,
        name = b.Name,
        description = b.Description,
        slug = b.Slug,
        logoUrl = b.LogoUrl,
        website = b.Website,
        displayOrder = b.DisplayOrder,
        isActive = b.IsActive,
        createdAt = b.CreatedAt,
        updatedAt = b.UpdatedAt,
        productCount
    };

    /// <summary>Bao gói phân trang dùng chung cho `/products` và `/products/search`.</summary>
    public static object Paged(int total, int page, int pageSize, IEnumerable<object> products)
    {
        var totalPages = pageSize > 0 ? (total + pageSize - 1) / pageSize : 0;
        return new
        {
            total,
            page,
            pageSize,
            totalPages,
            hasNextPage = page < totalPages,
            hasPreviousPage = page > 1,
            // Dải kết quả đang hiển thị, tính ở SERVER để frontend không còn tự suy ra "1 - 0".
            rangeFrom = total == 0 ? 0 : ((page - 1) * pageSize) + 1,
            rangeTo = total == 0 ? 0 : Math.Min(page * pageSize, total),
            products
        };
    }
}
