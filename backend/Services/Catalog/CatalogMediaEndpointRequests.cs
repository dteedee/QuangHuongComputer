using Catalog.Domain;

namespace Catalog;

/// <summary>Request record dùng bởi <see cref="CatalogMediaEndpoints"/> — tách riêng để giữ file endpoint dưới 200 dòng.</summary>
public static partial class CatalogMediaEndpoints
{
    public record AddMediaRequest(
        MediaType Type,
        string Url,
        string? ThumbnailUrl,
        string? AltText,
        int SortOrder,
        bool IsPrimary,
        long? FileSize,
        int? DurationSeconds,
        Guid? VariantId);

    public record UpdateMediaRequest(string? AltText, int? SortOrder, bool? IsPrimary);
    public record ReorderRequest(List<Guid> Ids);
}
