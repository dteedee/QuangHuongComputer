using System.Security.Claims;
using System.Text.RegularExpressions;
using BuildingBlocks.Security;
using BuildingBlocks.Caching;
using BuildingBlocks.Validation;
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
///
/// W2-1: các handler dưới đây KHÔNG BAO GIỜ chạm `Product._medias` (navigation qua backing
/// field). W1-6 phát hiện + để lại nguyên trạng một lỗi thật: gọi `product.AddMedia(media)` khi
/// `_medias` chưa được nạp thì `SaveChangesAsync` ghi 0 dòng (im lặng); nạp bằng
/// `db.Entry(product).Collection("_medias").LoadAsync()` thì ném `InvalidOperationException` lúc
/// chạy (tên navigation không khớp cấu hình EF). Sửa triệt để: ghi thẳng vào `DbSet&lt;ProductMedia&gt;`
/// (giống các endpoint biến thể/thông số vốn đã làm đúng kiểu này) và đặt/gỡ cờ "chính" bằng
/// `ExecuteUpdateAsync` trên chính bảng đó - không đi qua bất kỳ navigation nào của `Product`.
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
            Guid id, AddMediaRequest req, CatalogDbContext db, ICacheService cache, CancellationToken ct) =>
        {
            var productExists = await db.Products.AnyAsync(p => p.Id == id, ct);
            if (!productExists) return Results.NotFound();

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

            // Chỉ 1 primary/product (filtered UNIQUE index chặn ở CSDL nếu đây bị bỏ sót do race):
            // unset cái đang có TRƯỚC KHI thêm dòng mới, thẳng trên bảng - không qua navigation.
            if (media.IsPrimary)
                await db.ProductMedias.Where(m => m.ProductId == id && m.IsPrimary)
                    .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsPrimary, false), ct);

            db.ProductMedias.Add(media);
            await db.SaveChangesAsync(ct);

            // D02: `Product.ImageUrl` là ảnh chính khử-chuẩn-hoá (denormalized) - đồng bộ khi đổi primary.
            if (media.IsPrimary && media.Type == MediaType.Image)
                await db.Products.Where(p => p.Id == id)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.ImageUrl, media.Url), ct);

            await CatalogProductHelpers.InvalidateProductCachesAsync(cache, id);
            return Results.Ok(new { id = media.Id, url = media.Url, thumbnailUrl = media.ThumbnailUrl });
        }).RequirePermission(Permissions.Content.ManageMedia).WithValidation<AddMediaRequest>();

        // ---- Sửa alt / sortOrder / isPrimary ----
        group.MapPut("/products/{id:guid}/media/{mid:guid}", async (
            Guid id, Guid mid, UpdateMediaRequest req, CatalogDbContext db, ICacheService cache, CancellationToken ct) =>
        {
            var media = await db.ProductMedias.FirstOrDefaultAsync(m => m.Id == mid && m.ProductId == id, ct);
            if (media == null) return Results.NotFound();

            if (req.AltText != null) media.UpdateAltText(req.AltText);
            if (req.SortOrder.HasValue) media.UpdateSortOrder(req.SortOrder.Value);

            string? newPrimaryUrl = null;
            if (req.IsPrimary == true)
            {
                if (media.Type != MediaType.Image)
                    return Results.BadRequest(new { error = "Chỉ ảnh mới được đặt làm ảnh chính" });
                await db.ProductMedias.Where(m => m.ProductId == id && m.IsPrimary && m.Id != mid)
                    .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsPrimary, false), ct);
                media.SetPrimary(true);
                newPrimaryUrl = media.Url;
            }
            else if (req.IsPrimary == false)
            {
                media.SetPrimary(false);
            }

            await db.SaveChangesAsync(ct);

            if (newPrimaryUrl != null)
                await db.Products.Where(p => p.Id == id)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.ImageUrl, newPrimaryUrl), ct);

            await CatalogProductHelpers.InvalidateProductCachesAsync(cache, id);
            return Results.NoContent();
        }).RequirePermission(Permissions.Content.ManageMedia);

        // ---- Xoá / sắp xếp lại: CatalogMediaAdminEndpoints.cs (giữ file này dưới 200 dòng) ----
        group.MapCatalogMediaAdminEndpoints();
    }
}
