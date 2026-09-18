namespace BuildingBlocks.Storage;

/// <summary>
/// D02: hai seam duy nhất được phép biến URL tương đối thành tuyệt đối. Đây là seam phía backend —
/// dùng CHỈ cho email, sitemap, OG/JSON-LD, PDF. Mọi nơi khác (API response, DB) giữ nguyên tương đối.
/// Seam còn lại là <c>resolveMediaUrl()</c> phía frontend (W0-7 / W1-8).
/// </summary>
public interface IMediaUrlResolver
{
    /// <summary>
    /// Ghép <paramref name="relativeUrl"/> với <c>Storage:PublicBaseUrl</c>. Đã là URL tuyệt đối
    /// (http/https — ví dụ nhúng YouTube) thì trả nguyên văn. Rỗng hoặc <c>PublicBaseUrl</c> chưa
    /// cấu hình → trả về nguyên văn tương đối (không bịa domain).
    /// </summary>
    string ToAbsolute(string? relativeUrl);
}
