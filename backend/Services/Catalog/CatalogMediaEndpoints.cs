using System.Security.Claims;
using System.Text.RegularExpressions;
using BuildingBlocks.Security;
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
/// Upload đi qua MediaValidator (magic bytes) + MediaUploadService (đĩa local qua IFileStorage,
/// W1-6 / D02 — MinIO đã gỡ hoàn toàn). Request/response record types: <c>CatalogMediaEndpointRequests.cs</c> (giữ file dưới 200 dòng).
/// </summary>
public static partial class CatalogMediaEndpoints
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
            CatalogDbContext db,
            ClaimsPrincipal user,
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

            // W0-3: productId đi thẳng vào đường dẫn lưu trữ — phải tồn tại thật.
            if (!await db.Products.AnyAsync(p => p.Id == productId, ct))
                return Results.BadRequest(new { error = "Sản phẩm không tồn tại" });

            var uploaderId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uploaderId)) return Results.Unauthorized();
            if (!CatalogMediaUploadQuota.TryConsume(uploaderId, file.Length))
                return Results.Json(
                    new { error = $"Vượt hạn mức tải lên {CatalogMediaUploadQuota.BytesPerHour / (1024 * 1024)}MB/giờ. Thử lại sau." },
                    statusCode: StatusCodes.Status429TooManyRequests);

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
        // W1-6 (adversarial-verification fix, 2026-09-18): the first cut used
        // Permissions.Catalog.Manage here, which Marketing does NOT hold (only Catalog.View) —
        // a real regression vs. the pre-existing RequireRole(Admin,Manager,Marketing) (W0-3), and
        // the opposite of what integration-requests-w1.md's W1-10 section B.1 and wave-0 IR #43/#44
        // both ask for on this exact file: Permissions.Content.ManageMedia (Admin/Manager/Marketing
        // all hold it), which also finally aligns the attach/edit/delete/reorder endpoints below
        // (previously Admin-only) so Marketing can attach what it uploads — closing IR #44 for real.
        .RequirePermission(Permissions.Content.ManageMedia);

        // ---- Thêm media (record) vào sản phẩm ----
        group.MapPost("/products/{id:guid}/media", async (
            Guid id, AddMediaRequest req, CatalogDbContext db, CancellationToken ct) =>
        {
            var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
            if (product == null) return Results.NotFound();

            // W1-6 found a pre-existing defect here while verifying this track (reproduced on TEST
            // 2026-09-18, see reports/integration-requests-w1.md and w1-6-report.md "Unresolved"):
            // product.AddMedia(media) below never persists (SaveChangesAsync silently writes 0 rows)
            // because `_medias` (PropertyAccessMode.Field) is never loaded here. The obvious fix —
            // `db.Entry(product).Collection("_medias").LoadAsync(ct)`, the exact pattern the PUT
            // handler below already uses — throws InvalidOperationException at runtime ("The
            // property 'Product._medias' could not be found"), so the real fix is deeper than this
            // file (Catalog/Infrastructure/CatalogDbContext.cs + Domain/Product.cs, W2-1 ownership,
            // not W1-6's). Left AS-IS (not W1-6's regression to introduce) — flagged, not patched.
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
        }).RequirePermission(Permissions.Content.ManageMedia);

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
        }).RequirePermission(Permissions.Content.ManageMedia);

        // ---- Xoá media ----
        group.MapDelete("/products/{id:guid}/media/{mid:guid}", async (
            Guid id, Guid mid, CatalogDbContext db, MediaUploadService uploader, CancellationToken ct) =>
        {
            var media = await db.ProductMedias.FirstOrDefaultAsync(m => m.Id == mid && m.ProductId == id, ct);
            if (media == null) return Results.NotFound();
            db.ProductMedias.Remove(media);
            await db.SaveChangesAsync(ct);
            // Best-effort xoá file vật lý — DeleteAsync tự no-op an toàn nếu URL không phải của
            // storage runtime (ảnh seed /media/seed/**, legacy /uploads/**, nhúng YouTube).
            try
            {
                if (media.Type != MediaType.YoutubeEmbed)
                {
                    if (!string.IsNullOrEmpty(media.Url)) await uploader.DeleteAsync(media.Url, ct);
                    if (!string.IsNullOrEmpty(media.ThumbnailUrl) && media.ThumbnailUrl != media.Url)
                        await uploader.DeleteAsync(media.ThumbnailUrl, ct);
                }
            }
            catch { /* ignore — record đã xoá khỏi DB, xoá file chỉ là dọn dẹp best-effort */ }
            return Results.NoContent();
        }).RequirePermission(Permissions.Content.ManageMedia);

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
        }).RequirePermission(Permissions.Content.ManageMedia);
    }
}
