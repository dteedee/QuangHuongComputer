namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

/// <summary>
/// Đại diện 1 media (ảnh/video/nhúng YouTube) của Product hoặc Variant.
/// Thay cho `Product.ImageUrl` (1 ảnh) + `GalleryImages` (JSON) trước đây,
/// cho phép nhiều ảnh có thứ tự, alt text, ảnh chính, và ảnh theo biến thể.
/// </summary>
public class ProductMedia : Entity<Guid>
{
    public Guid ProductId { get; private set; }

    /// <summary>Null = media chung của sản phẩm; có giá trị = media riêng cho 1 biến thể.</summary>
    public Guid? VariantId { get; private set; }

    public MediaType Type { get; private set; }

    /// <summary>URL đầy đủ tới file media (MinIO signed URL hoặc URL YouTube embed).</summary>
    public string Url { get; private set; } = string.Empty;

    /// <summary>URL thumbnail (200px WebP cho ảnh, YouTube thumbnail cho video nhúng).</summary>
    public string? ThumbnailUrl { get; private set; }

    /// <summary>Alt text mô tả — chú ý escape HTML khi hiển thị (chống XSS lưu trữ).</summary>
    public string AltText { get; private set; } = string.Empty;

    public int SortOrder { get; private set; }
    public bool IsPrimary { get; private set; }

    /// <summary>Dung lượng file (byte) — null với YouTube embed.</summary>
    public long? FileSize { get; private set; }

    /// <summary>Thời lượng video (giây) — null với ảnh.</summary>
    public int? DurationSeconds { get; private set; }

    // Navigation
    public virtual Product? Product { get; private set; }

    protected ProductMedia() { }

    public static ProductMedia CreateImage(
        Guid productId,
        string url,
        string? thumbnailUrl = null,
        string altText = "",
        int sortOrder = 0,
        bool isPrimary = false,
        long? fileSize = null,
        Guid? variantId = null)
    {
        ValidateUrl(url);
        ValidateSortOrder(sortOrder);
        return new ProductMedia
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            VariantId = variantId,
            Type = MediaType.Image,
            Url = url,
            ThumbnailUrl = thumbnailUrl,
            AltText = altText ?? string.Empty,
            SortOrder = sortOrder,
            IsPrimary = isPrimary,
            FileSize = fileSize,
        };
    }

    public static ProductMedia CreateVideo(
        Guid productId,
        string url,
        string? thumbnailUrl = null,
        string altText = "",
        int sortOrder = 0,
        long? fileSize = null,
        int? durationSeconds = null,
        Guid? variantId = null)
    {
        ValidateUrl(url);
        ValidateSortOrder(sortOrder);
        return new ProductMedia
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            VariantId = variantId,
            Type = MediaType.Video,
            Url = url,
            ThumbnailUrl = thumbnailUrl,
            AltText = altText ?? string.Empty,
            SortOrder = sortOrder,
            IsPrimary = false, // video không thể là ảnh chính
            FileSize = fileSize,
            DurationSeconds = durationSeconds,
        };
    }

    /// <summary>
    /// Nhúng YouTube — url phải là dạng embed hợp lệ (đã được validate ở endpoint bằng regex).
    /// </summary>
    public static ProductMedia CreateYoutubeEmbed(
        Guid productId,
        string embedUrl,
        string? thumbnailUrl = null,
        string altText = "",
        int sortOrder = 0,
        Guid? variantId = null)
    {
        ValidateUrl(embedUrl);
        ValidateSortOrder(sortOrder);
        return new ProductMedia
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            VariantId = variantId,
            Type = MediaType.YoutubeEmbed,
            Url = embedUrl,
            ThumbnailUrl = thumbnailUrl,
            AltText = altText ?? string.Empty,
            SortOrder = sortOrder,
            IsPrimary = false,
        };
    }

    public void UpdateAltText(string altText)
    {
        AltText = altText ?? string.Empty;
    }

    public void UpdateSortOrder(int sortOrder)
    {
        ValidateSortOrder(sortOrder);
        SortOrder = sortOrder;
    }

    /// <summary>
    /// Đặt media này thành ảnh chính. Chỉ áp dụng cho ảnh (không cho video/YouTube).
    /// Quy tắc "chỉ 1 primary/product" được xử lý ở tầng ứng dụng khi lưu (unset các cái còn lại).
    /// </summary>
    public void SetPrimary(bool value)
    {
        if (value && Type != MediaType.Image)
            throw new InvalidOperationException("Chỉ media loại Image có thể là ảnh chính.");
        IsPrimary = value;
    }

    public void UpdateVariantAssignment(Guid? variantId)
    {
        VariantId = variantId;
    }

    private static void ValidateUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            throw new ArgumentException("URL media không được rỗng", nameof(url));
    }

    private static void ValidateSortOrder(int sortOrder)
    {
        if (sortOrder < 0)
            throw new ArgumentException("SortOrder không được âm", nameof(sortOrder));
    }
}

public enum MediaType
{
    Image = 1,
    Video = 2,
    YoutubeEmbed = 3,
}
