using BuildingBlocks.Storage;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Catalog.Application.Media;

/// <summary>
/// Xử lý ảnh (ImageSharp) rồi ghi xuống đĩa qua <see cref="IFileStorage"/> (W1-6 / D02 — MinIO đã gỡ).
/// Đúng 2 rendition cho MỌI ảnh: 400w (thumbnail: card/list/giỏ) và 1600w (main: PDP/zoom) —
/// D02 siết từ {200,800,1600} xuống {400,1600} để khớp ngân sách dung lượng seed.
/// Key/URL do <see cref="IFileStorage"/> quyết định (area "products", layout
/// <c>products/{yyyy}/{MM}/{guid}-{slug}.webp</c>) — service này không còn tự dựng object key.
/// </summary>
public sealed class MediaUploadService
{
    private readonly IFileStorage _storage;

    /// <summary>D02: đúng 2 kích thước — index 0 = thumbnail, index 1 = main.</summary>
    private static readonly int[] ImageWidths = { 400, 1600 };

    public MediaUploadService(IFileStorage storage)
    {
        _storage = storage;
    }

    /// <summary>Sinh 2 rendition WebP (400/1600) từ ảnh gốc và ghi qua <see cref="IFileStorage"/>. Trả URL main + URL thumbnail (tương đối).</summary>
    public async Task<MediaUploadResult> UploadImageAsync(
        Stream source,
        Guid productId,
        string extension,
        string mimeType,
        CancellationToken ct = default)
    {
        return await SaveRenditionsAsync(source, "products", ProductSlug(productId), stripMetadata: false, ct);
    }

    /// <summary>
    /// Ảnh đánh giá của khách: cùng quy trình với ảnh sản phẩm (giải mã bằng ImageSharp rồi MÃ HOÁ
    /// LẠI WebP ⇒ mọi payload lạ bám trong file gốc đều rơi mất), lưu ở vùng <c>reviews</c> với
    /// slug cố định <c>review</c> — đúng định dạng mà <c>ReviewPhotoPolicy</c> chấp nhận.
    /// Khác ảnh sản phẩm: XOÁ EXIF/IPTC/XMP — ảnh chụp bằng điện thoại của khách thường mang toạ độ GPS nhà họ.
    /// </summary>
    public Task<MediaUploadResult> UploadReviewImageAsync(Stream source, CancellationToken ct = default)
        => SaveRenditionsAsync(source, Domain.ReviewPhotoPolicy.StorageArea, "review", stripMetadata: true, ct);

    private async Task<MediaUploadResult> SaveRenditionsAsync(
        Stream source, string area, string slug, bool stripMetadata, CancellationToken ct)
    {
        source.Position = 0;
        using var image = await Image.LoadAsync(source, ct);
        if (stripMetadata)
        {
            image.Metadata.ExifProfile = null;
            image.Metadata.IptcProfile = null;
            image.Metadata.XmpProfile = null;
        }
        var originalFileSize = source.Length;

        string? thumbnailUrl = null;
        string? mainUrl = null;

        foreach (var width in ImageWidths)
        {
            using var variantStream = new MemoryStream();
            using (var clone = image.Clone(ctx => Resize(ctx, image.Width, image.Height, width)))
            {
                // D02 / phản biện #5: KHÔNG gọi .withMetadata() ở đây — sharp/ImageSharp giữ metadata
                // mặc định khác nhau; ImageSharp WebpEncoder ĐÃ giữ EXIF/IPTC/XMP mặc định (không
                // phải sửa gì, xem D02 dòng "MediaUploadService dùng ImageSharp WebpEncoder, giữ
                // metadata mặc định - không phải sửa").
                await clone.SaveAsync(variantStream, new WebpEncoder { Quality = 85 }, ct);
            }
            variantStream.Position = 0;
            var stored = await _storage.SaveAsync(variantStream, area, "webp", "image/webp", $"{slug}-w{width}", ct);

            if (width == ImageWidths[0]) thumbnailUrl = stored.RelativeUrl;
            else mainUrl = stored.RelativeUrl;
        }

        return new MediaUploadResult(
            Url: mainUrl ?? thumbnailUrl ?? string.Empty,
            ThumbnailUrl: thumbnailUrl,
            FileSize: originalFileSize,
            MimeType: "image/webp");
    }

    /// <summary>Upload video (không transcode): ghi nguyên văn qua <see cref="IFileStorage"/>.</summary>
    public async Task<MediaUploadResult> UploadVideoAsync(
        Stream source,
        Guid productId,
        string extension,
        string mimeType,
        CancellationToken ct = default)
    {
        source.Position = 0;
        var slug = ProductSlug(productId);
        var stored = await _storage.SaveAsync(source, "products", extension, mimeType, slug, ct);
        return new MediaUploadResult(
            Url: stored.RelativeUrl,
            ThumbnailUrl: null,
            FileSize: stored.FileSize,
            MimeType: mimeType);
    }

    /// <summary>Xoá một file runtime theo URL tương đối đã lưu trên <c>ProductMedia</c>. Best-effort — no-op an toàn nếu URL không phải của storage này (seed/legacy/YouTube).</summary>
    public Task DeleteAsync(string relativeUrl, CancellationToken ct = default) => _storage.DeleteAsync(relativeUrl, ct);

    private static string ProductSlug(Guid productId) => productId.ToString("N")[..8];

    /// <summary>Resize giữ tỉ lệ: chỉ scale-down (không upscale ảnh nhỏ hơn target).</summary>
    private static void Resize(IImageProcessingContext ctx, int origW, int origH, int targetWidth)
    {
        if (origW <= targetWidth)
        {
            return; // giữ nguyên
        }
        var ratio = (double)targetWidth / origW;
        var newH = (int)Math.Round(origH * ratio);
        ctx.Resize(new ResizeOptions
        {
            Size = new Size(targetWidth, newH),
            Mode = ResizeMode.Max,
        });
    }
}

public readonly record struct MediaUploadResult(
    string Url,
    string? ThumbnailUrl,
    long FileSize,
    string MimeType);
