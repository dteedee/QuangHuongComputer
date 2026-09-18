using Catalog.Domain;

namespace Catalog.Application.Products;

/// <summary>D02: hình dạng media trong `medias[]` của DTO chi tiết - đường dẫn TƯƠNG ĐỐI.</summary>
public record ProductMediaDto(
    Guid Id, string Url, string? ThumbnailUrl, string Alt, bool IsPrimary, int SortOrder, MediaType Type);

/// <summary>Một giá trị thông số đã gắn với attribute có cấu trúc (hoặc mục JSON cũ - xem <see cref="ProductDtoProjection"/>).</summary>
public record SpecValueDto(Guid AttributeId, string Key, string Name, string? Unit, string DataType, object? Value);

/// <summary>Nhóm thông số + các giá trị thuộc nhóm, đã sắp theo `SortOrder`.</summary>
public record SpecGroupDto(Guid GroupId, string GroupName, int SortOrder, IReadOnlyList<SpecValueDto> Values);

public record VariantOptionDto(Guid OptionTypeId, string OptionTypeName, Guid OptionValueId, string OptionValueDisplay, string? ColorHex);

public record ProductVariantDto(
    Guid Id, string Sku, string Name, decimal Price, decimal? OldPrice, decimal CostPrice,
    int StockQuantity, VariantStatus Status, bool IsDefault, int SortOrder,
    IReadOnlyList<VariantOptionDto> Options);

/// <summary>
/// MỘT hình dạng JSON duy nhất cho sản phẩm - dùng ở list, detail, search, admin CRUD và
/// related-products (Requirements: "one ProductDto projection - six copies exist today").
/// `Medias`/`SpecGroups`/`Variants` chỉ khác null khi endpoint chi tiết được yêu cầu qua
/// `?include=media,specs,variants` (step 2 của phase file) - list/search luôn để null (không kéo
/// N+1 query) và chỉ mang `ThumbnailUrl` (D02).
/// </summary>
public record ProductDto(
    Guid Id,
    string Name,
    string Sku,
    string Slug,
    decimal Price,
    decimal? OldPrice,
    string Description,
    string? Specifications,
    string? WarrantyInfo,
    int? WarrantyMonths,
    bool IsReturnExcluded,
    string UnitName,
    string? StockLocations,
    int StockQuantity,
    ProductStatus Status,
    int ViewCount,
    int SoldCount,
    float AverageRating,
    int ReviewCount,
    string? ImageUrl,
    string? ThumbnailUrl,
    int LowStockThreshold,
    bool IsActive,
    DateTime? PublishedAt,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    string? CreatedBy,
    string? UpdatedBy,
    string CategoryId,
    string? CategoryName,
    string? CategorySlug,
    string BrandId,
    string? BrandName,
    string? BrandSlug,
    string? GalleryImages,
    string? Attributes,
    string? MetaTitle,
    string? MetaDescription,
    string? MetaKeywords,
    string? CanonicalUrl,
    IReadOnlyList<ProductMediaDto>? Medias,
    IReadOnlyList<SpecGroupDto>? SpecGroups,
    IReadOnlyList<ProductVariantDto>? Variants);
