using System.Text.Json;
using System.Text.RegularExpressions;

namespace Catalog.Domain;

/// <summary>Một ảnh đánh giá: bản lớn (1600w) cho lightbox + thumbnail (400w) cho danh sách.</summary>
public sealed record ReviewPhoto(string Url, string ThumbnailUrl);

/// <summary>
/// Luật ảnh đánh giá của khách. Chỉ chấp nhận URL do CHÍNH hệ thống sinh ra khi tải ảnh qua
/// <c>POST /api/catalog/reviews/photos</c>: file đã qua kiểm magic bytes và được mã hoá lại WebP,
/// nằm trong vùng <c>reviews</c> của kho media runtime (<c>/media/u/reviews/yyyy/MM/{guid}-review-w*.webp</c>).
/// URL ngoài (hotlink, <c>javascript:</c>, ảnh của người khác ở vùng <c>products</c>…) đều bị từ chối —
/// cả lúc ghi lẫn lúc đọc (phòng dữ liệu cũ).
/// </summary>
public static partial class ReviewPhotoPolicy
{
    public const int MaxPhotos = 5;
    public const string StorageArea = "reviews";

    [GeneratedRegex(@"^/media/u/reviews/\d{4}/\d{2}/[0-9a-f]{32}-review-w(400|1600)\.webp$", RegexOptions.CultureInvariant)]
    private static partial Regex OwnStorageUrl();

    public static bool IsOwnStorageUrl(string? url) => !string.IsNullOrEmpty(url) && OwnStorageUrl().IsMatch(url);

    public static bool IsAcceptable(ReviewPhoto photo)
        => IsOwnStorageUrl(photo.Url) && IsOwnStorageUrl(photo.ThumbnailUrl);

    public static string? Serialize(IReadOnlyList<ReviewPhoto>? photos)
        => photos == null || photos.Count == 0 ? null : JsonSerializer.Serialize(photos);

    /// <summary>Đọc cột <c>ImageUrls</c>; bỏ mọi phần tử không phải ảnh của kho cửa hàng.</summary>
    public static IReadOnlyList<ReviewPhoto> Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Array.Empty<ReviewPhoto>();
        try
        {
            var photos = JsonSerializer.Deserialize<List<ReviewPhoto>>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return photos?.Where(p => p != null && IsAcceptable(p)).Take(MaxPhotos).ToList()
                ?? (IReadOnlyList<ReviewPhoto>)Array.Empty<ReviewPhoto>();
        }
        catch (JsonException)
        {
            return Array.Empty<ReviewPhoto>(); // dữ liệu cũ dạng mảng chuỗi URL tuỳ ý: không hiển thị
        }
    }
}
