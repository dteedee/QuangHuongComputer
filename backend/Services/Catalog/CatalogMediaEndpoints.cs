using System.Text.RegularExpressions;
using Catalog.Application.Media;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Catalog;

/// <summary>
/// Endpoint quản lý media (ảnh/video/nhúng YouTube) của sản phẩm.
/// Upload đi qua MediaValidator (magic bytes) + MediaUploadService (MinIO).
/// </summary>
public static class CatalogMediaEndpoints
{
    /// <summary>Regex YouTube: chỉ chấp `youtube.com/watch?v=`, `youtube.com/embed/`, `youtu.be/`.</summary>
    private static readonly Regex YoutubeRegex = new(
        @"^(?:https?://)?(?:www\.)?(?:youtube\.com/(?:embed/|watch\?v=)|youtu\.be/)([A-Za-z0-9_-]{6,})",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public static void MapCatalogMediaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog");

        // ---- Upload file thô (không gắn với product; trả URL để endpoint attach dùng sau) ----
        group.MapPost("/media/upload", async (
            HttpRequest request,
            MediaValidator validator,
            MediaUploadService uploader,
            Guid productId,
            string kind /* "image" | "video" */,
            CancellationToken ct) =>
        {
            if (!request.HasFormContentType)
                return Results.BadRequest(new { error = "Yêu cầu multipart/form-data" });
            var form = await request.ReadFormAsync(ct);
            var file = form.Files.FirstOrDefault();
            if (file == null || file.Length == 0)
                return Results.BadRequest(new { error = "Chưa có file" });

            using var stream = file.OpenReadStream();
            MediaValidationResult v;
            MediaUploadResult uploaded;
            if (string.Equals(kind, "video", StringComparison.OrdinalIgnoreCase))
            {
                v = validator.ValidateVideo(stream, file.ContentType, file.FileName);
                if (!v.IsValid) return Results.BadRequest(new { error = v.ErrorMessage });
                uploaded = await uploader.UploadVideoAsync(stream, productId, v.Extension!, v.MimeType!, ct);
            }
            else
            {
                v = validator.ValidateImage(stream, file.ContentType, file.FileName);
                if (!v.IsValid) return Results.BadRequest(new { error = v.ErrorMessage });
                uploaded = await uploader.UploadImageAsync(stream, productId, v.Extension!, v.MimeType!, ct);
            }

            return Results.Ok(new
            {
                url = uploaded.Url,
                thumbnailUrl = uploaded.ThumbnailUrl,
                fileSize = uploaded.FileSize,
                mimeType = uploaded.MimeType,
            });
        })
        .DisableAntiforgery()
        .RequireAuthorization();

        // ---- Thêm media (record) vào sản phẩm ----
        group.MapPost("/products/{id:guid}/media", async (
            Guid id, AddMediaRequest req, CatalogDbContext db, CancellationToken ct) =>
        {
            var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
            if (product == null) return Results.NotFound();

            ProductMedia media;
            if (req.Type == MediaType.YoutubeEmbed)
            {
                if (string.IsNullOrWhiteSpace(req.Url) || !YoutubeRegex.IsMatch(req.Url))
                    return Results.BadRequest(new { error = "URL YouTube không hợp lệ" });
                var videoId = YoutubeRegex.Match(req.Url).Groups[1].Value;
                var embed = $"https://www.youtube.com/embed/{videoId}";
                var thumb = $"https://img.youtube.com/vi/{videoId}/hqdefault.jpg";
                media = ProductMedia.CreateYoutubeEmbed(id, embed, thumb, req.AltText ?? string.Empty, req.SortOrder);
            }
            else if (req.Type == MediaType.Video)
            {
                media = ProductMedia.CreateVideo(id, req.Url, req.ThumbnailUrl, req.AltText ?? string.Empty,
                    req.SortOrder, req.FileSize, req.DurationSeconds, req.VariantId);
            }
            else
            {
                media = ProductMedia.CreateImage(id, req.Url, req.ThumbnailUrl, req.AltText ?? string.Empty,
                    req.SortOrder, req.IsPrimary, req.FileSize, req.VariantId);
            }

            product.AddMedia(media);
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { id = media.Id });
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        // ---- Sửa alt / sortOrder / isPrimary ----
        group.MapPut("/products/{id:guid}/media/{mid:guid}", async (
            Guid id, Guid mid, UpdateMediaRequest req, CatalogDbContext db, CancellationToken ct) =>
        {
            var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
            if (product == null) return Results.NotFound();
            var media = await db.ProductMedias.FirstOrDefaultAsync(m => m.Id == mid && m.ProductId == id, ct);
            if (media == null) return Results.NotFound();

            if (req.AltText != null) media.UpdateAltText(req.AltText);
            if (req.SortOrder.HasValue) media.UpdateSortOrder(req.SortOrder.Value);
            if (req.IsPrimary.HasValue && req.IsPrimary.Value)
            {
                // Load các media của product để tương tác helper SetPrimaryMedia
                await db.Entry(product).Collection("_medias").LoadAsync(ct);
                product.SetPrimaryMedia(mid);
            }
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        // ---- Xoá media ----
        group.MapDelete("/products/{id:guid}/media/{mid:guid}", async (
            Guid id, Guid mid, CatalogDbContext db, MediaUploadService uploader, CancellationToken ct) =>
        {
            var media = await db.ProductMedias.FirstOrDefaultAsync(m => m.Id == mid && m.ProductId == id, ct);
            if (media == null) return Results.NotFound();
            db.ProductMedias.Remove(media);
            await db.SaveChangesAsync(ct);
            // Best-effort xoá file vật lý (không chặn nếu MinIO down)
            try
            {
                if (media.Type != MediaType.YoutubeEmbed && !string.IsNullOrEmpty(media.Url))
                {
                    var key = ExtractObjectKey(media.Url);
                    if (!string.IsNullOrEmpty(key)) await uploader.DeleteAsync(key, ct);
                }
            }
            catch { /* ignore — record đã xoá khỏi DB */ }
            return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        // ---- Sắp xếp lại: body { ids: [uuid, uuid, ...] } — vị trí = index ----
        group.MapPost("/products/{id:guid}/media/reorder", async (
            Guid id, ReorderRequest req, CatalogDbContext db, CancellationToken ct) =>
        {
            if (req.Ids == null || req.Ids.Count == 0) return Results.BadRequest();
            var medias = await db.ProductMedias.Where(m => m.ProductId == id).ToListAsync(ct);
            var order = req.Ids.Select((mid, idx) => new { mid, idx }).ToDictionary(x => x.mid, x => x.idx);
            foreach (var m in medias)
                if (order.TryGetValue(m.Id, out var pos)) m.UpdateSortOrder(pos);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequireAuthorization(p => p.RequireRole("Admin"));
    }

    /// <summary>Trích object key từ URL public dạng {base}/{bucket}/{key}.</summary>
    private static string? ExtractObjectKey(string url)
    {
        if (string.IsNullOrEmpty(url)) return null;
        var idx = url.IndexOf("/products/", StringComparison.OrdinalIgnoreCase);
        return idx < 0 ? null : url.Substring(idx + 1); // bỏ dấu '/' đầu
    }

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
