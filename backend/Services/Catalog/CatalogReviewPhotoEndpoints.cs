using System.Security.Claims;
using BuildingBlocks.Security;
using Catalog.Application.Media;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Catalog;

/// <summary>
/// <c>POST /api/catalog/reviews/photos</c> — khách đã đăng nhập tải MỘT ảnh cho đánh giá.
///
/// Dùng lại đúng đường kiểm tra của ảnh sản phẩm: <see cref="MediaValidator"/> (magic bytes, ≤ 5MB,
/// cấm SVG, bỏ qua tên file/Content-Type của client) → <see cref="MediaUploadService"/> giải mã và
/// MÃ HOÁ LẠI WebP (400w + 1600w, xoá EXIF/GPS). Hạn mức dung lượng theo tài khoản
/// (<see cref="CatalogMediaUploadQuota"/>) chặn việc dùng endpoint này làm kho chứa file.
/// URL trả về là thứ DUY NHẤT mà <c>POST /products/{id}/reviews</c> chấp nhận trong <c>photos</c>.
/// </summary>
public static class CatalogReviewPhotoEndpoints
{
    public static void MapCatalogReviewPhotoEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapPost("/reviews/photos", async (
            HttpRequest request, MediaValidator validator, MediaUploadService uploader,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (!request.HasFormContentType)
                return Results.BadRequest(new { error = "Yêu cầu multipart/form-data" });

            var form = await request.ReadFormAsync(ct);
            if (form.Files.Count != 1) return Results.BadRequest(new { error = "Mỗi lần tải đúng một ảnh" });
            var file = form.Files[0];
            if (file.Length == 0) return Results.BadRequest(new { error = "Chưa có file" });

            if (!CatalogMediaUploadQuota.TryConsume(userId, file.Length))
                return Results.Json(
                    new { error = $"Vượt hạn mức tải lên {CatalogMediaUploadQuota.BytesPerHour / (1024 * 1024)}MB/giờ. Thử lại sau." },
                    statusCode: StatusCodes.Status429TooManyRequests);

            await using var buffer = new MemoryStream();
            await file.CopyToAsync(buffer, ct);
            var check = validator.ValidateImage(buffer, file.ContentType, file.FileName);
            if (!check.IsValid) return Results.BadRequest(new { error = check.ErrorMessage });

            try
            {
                var uploaded = await uploader.UploadReviewImageAsync(buffer, ct);
                return Results.Ok(new { url = uploaded.Url, thumbnailUrl = uploaded.ThumbnailUrl ?? uploaded.Url });
            }
            catch (SixLabors.ImageSharp.ImageFormatException)
            {
                // Header đúng nhưng thân file hỏng/giả mạo: giải mã thất bại ⇒ không lưu gì.
                return Results.BadRequest(new { error = "Ảnh bị hỏng hoặc không đọc được" });
            }
        })
        .DisableAntiforgery()
        .RequireAuthorization(SecurityPolicies.Authenticated);
    }
}
