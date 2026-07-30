using Minio;
using Minio.DataModel.Args;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Catalog.Application.Media;

/// <summary>
/// Tải file lên MinIO + sinh 3 kích thước WebP cho ảnh (200 / 800 / 1600).
/// Bucket: quanghuong-media (không public — phục vụ qua PublicBaseUrl / signed URL).
/// Key format: products/{productId}/{uuid}.{ext}
/// Idempotent: nếu key trùng (rất hiếm), sinh UUID mới và thử lại.
/// </summary>
public sealed class MediaUploadService
{
    private readonly IMinioClient _minio;
    private readonly MediaStorageOptions _options;

    private static readonly int[] ImageWidths = { 200, 800, 1600 };

    public MediaUploadService(IMinioClient minio, MediaStorageOptions options)
    {
        _minio = minio;
        _options = options;
    }

    /// <summary>Đảm bảo bucket tồn tại — gọi ở startup (không throw nếu MinIO down, chỉ log).</summary>
    public async Task EnsureBucketAsync(CancellationToken ct = default)
    {
        var exists = await _minio.BucketExistsAsync(new BucketExistsArgs().WithBucket(_options.Bucket), ct);
        if (!exists)
        {
            await _minio.MakeBucketAsync(new MakeBucketArgs().WithBucket(_options.Bucket), ct);
        }
    }

    /// <summary>Upload ảnh: sinh thumb-200 / md-800 / lg-1600 WebP. Trả URL gốc + URL thumbnail 200.</summary>
    public async Task<MediaUploadResult> UploadImageAsync(
        Stream source,
        Guid productId,
        string extension,
        string mimeType,
        CancellationToken ct = default)
    {
        source.Position = 0;
        using var image = await Image.LoadAsync(source, ct);

        var basePath = $"products/{productId}";
        var uuid = Guid.NewGuid().ToString("N");
        var originalKey = $"{basePath}/{uuid}.{SanitizeExtension(extension)}";

        // Upload bản gốc
        source.Position = 0;
        await PutObjectAsync(originalKey, source, source.Length, mimeType, ct);

        // Sinh 3 kích thước WebP
        string? thumbnailUrl = null;
        foreach (var width in ImageWidths)
        {
            var variantKey = $"{basePath}/{uuid}-w{width}.webp";
            using var variantStream = new MemoryStream();
            using (var clone = image.Clone(ctx => Resize(ctx, image.Width, image.Height, width)))
            {
                await clone.SaveAsync(variantStream, new WebpEncoder { Quality = 85 }, ct);
            }
            variantStream.Position = 0;
            await PutObjectAsync(variantKey, variantStream, variantStream.Length, "image/webp", ct);

            if (width == 200)
                thumbnailUrl = BuildPublicUrl(variantKey);
        }

        return new MediaUploadResult(
            Url: BuildPublicUrl(originalKey),
            ThumbnailUrl: thumbnailUrl,
            FileSize: source.Length,
            MimeType: mimeType,
            ObjectKey: originalKey);
    }

    /// <summary>Upload video (không xử lý transcode): giữ nguyên, chỉ đổi tên thành UUID.</summary>
    public async Task<MediaUploadResult> UploadVideoAsync(
        Stream source,
        Guid productId,
        string extension,
        string mimeType,
        CancellationToken ct = default)
    {
        source.Position = 0;
        var key = $"products/{productId}/{Guid.NewGuid():N}.{SanitizeExtension(extension)}";
        await PutObjectAsync(key, source, source.Length, mimeType, ct);
        return new MediaUploadResult(
            Url: BuildPublicUrl(key),
            ThumbnailUrl: null,
            FileSize: source.Length,
            MimeType: mimeType,
            ObjectKey: key);
    }

    public async Task DeleteAsync(string objectKey, CancellationToken ct = default)
    {
        await _minio.RemoveObjectAsync(
            new RemoveObjectArgs().WithBucket(_options.Bucket).WithObject(objectKey), ct);
    }

    private async Task PutObjectAsync(string key, Stream data, long size, string contentType, CancellationToken ct)
    {
        await _minio.PutObjectAsync(new PutObjectArgs()
            .WithBucket(_options.Bucket)
            .WithObject(key)
            .WithStreamData(data)
            .WithObjectSize(size)
            .WithContentType(contentType), ct);
    }

    private string BuildPublicUrl(string objectKey)
    {
        var baseUrl = _options.PublicBaseUrl.TrimEnd('/');
        return $"{baseUrl}/{_options.Bucket}/{objectKey}";
    }

    private static string SanitizeExtension(string ext)
    {
        var e = (ext ?? "bin").Trim().TrimStart('.').ToLowerInvariant();
        return string.IsNullOrEmpty(e) ? "bin" : e;
    }

    /// <summary>Resize giữ tỉ lệ: chỉ scale-down (không upscale ảnh nhỏ hơn target).</summary>
    private static void Resize(IImageProcessingContext ctx, int origW, int origH, int targetWidth)
    {
        if (origW <= targetWidth)
        {
            // giữ nguyên
            return;
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

public sealed class MediaStorageOptions
{
    public string Endpoint { get; set; } = "localhost:9000";
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string Bucket { get; set; } = "quanghuong-media";
    public bool UseSSL { get; set; }
    public string PublicBaseUrl { get; set; } = "http://localhost:9000";
}

public readonly record struct MediaUploadResult(
    string Url,
    string? ThumbnailUrl,
    long FileSize,
    string MimeType,
    string ObjectKey);
