using BuildingBlocks.Security;
using BuildingBlocks.Storage;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Content;

/// <summary>
/// Thư viện media dùng chung cho CMS (banner, bài viết, trang tĩnh) — W1-6 / D02.
/// Trước đây là 2 stack upload song song (Content ghi đĩa thô, Catalog qua MinIO); giờ CẢ HAI
/// đi qua CÙNG MỘT <see cref="IFileStorage"/> (đăng ký một lần bởi Catalog module — xem
/// <c>Catalog/DependencyInjection.cs</c> — nhưng khả dụng cho MỌI module vì modular monolith
/// dùng chung một <c>IServiceCollection</c>).
///
/// KHÔNG có bảng DB riêng cho thư viện media (YAGNI — chưa ai cần tìm kiếm/phân trang thật;
/// W3-4 "admin media library UI" là track sau mới build UI trên các endpoint này). "Liệt kê"
/// và "xoá" vì vậy làm việc trực tiếp trên hệ thống file qua <see cref="IFileStorage.ListAsync"/>
/// / <see cref="IFileStorage.DeleteAsync"/> — id của một media chính là URL tương đối của nó.
/// </summary>
public static class MediaEndpoints
{
    private const int DefaultPageSize = 24;
    private const int MaxPageSize = 100;

    public static void MapMediaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/media").RequirePermission(Permissions.Content.ManageMedia);

        // ---- Danh sách media (phân trang, lọc theo area) ----
        group.MapGet("/", async (IFileStorage storage, string? area, int page = 0, int pageSize = DefaultPageSize, CancellationToken ct = default) =>
        {
            var size = pageSize <= 0 ? DefaultPageSize : Math.Min(pageSize, MaxPageSize);
            var skip = Math.Max(page, 0) * size;

            var all = new List<StoredFile>();
            await foreach (var file in storage.ListAsync(area, ct))
            {
                all.Add(file);
                if (all.Count >= skip + size + 1) break; // đủ để cắt trang hiện tại + biết còn trang sau
            }

            var items = all.Skip(skip).Take(size)
                .Select(f => new { url = f.RelativeUrl, fileSize = f.FileSize, savedAt = f.SavedAt })
                .ToList();

            return Results.Ok(new { items, page = Math.Max(page, 0), pageSize = size, hasMore = all.Count > skip + size });
        });

        // ---- Upload 1 file — area mặc định "content" (banner/bài viết/trang tĩnh dùng chung) ----
        group.MapPost("/upload", async (IFormFile file, IFileStorage storage, string? area, CancellationToken ct) =>
        {
            var (isValid, errorMessage) = FileValidator.ValidateImage(file);
            if (!isValid) return Results.BadRequest(new { error = errorMessage });

            var extension = Path.GetExtension(file.FileName).TrimStart('.').ToLowerInvariant();
            await using var stream = file.OpenReadStream();
            var stored = await storage.SaveAsync(stream, string.IsNullOrWhiteSpace(area) ? "content" : area, extension, file.ContentType, ct: ct);

            return Results.Ok(new { url = stored.RelativeUrl, fileSize = stored.FileSize });
        })
        .DisableAntiforgery(); // cần thiết cho upload file trong minimal API

        // ---- Upload nhiều file ----
        group.MapPost("/upload-multiple", async (IFormFileCollection files, IFileStorage storage, string? area, CancellationToken ct) =>
        {
            if (files == null || files.Count == 0) return Results.BadRequest("Chưa có file");

            var results = new List<object>();
            foreach (var file in files)
            {
                var (isValid, errorMessage) = FileValidator.ValidateImage(file);
                if (!isValid)
                {
                    results.Add(new { originalName = file.FileName, error = errorMessage });
                    continue;
                }

                var extension = Path.GetExtension(file.FileName).TrimStart('.').ToLowerInvariant();
                await using var stream = file.OpenReadStream();
                var stored = await storage.SaveAsync(stream, string.IsNullOrWhiteSpace(area) ? "content" : area, extension, file.ContentType, ct: ct);
                results.Add(new { url = stored.RelativeUrl, originalName = file.FileName, fileSize = stored.FileSize });
            }

            return Results.Ok(results);
        })
        .DisableAntiforgery();

        // ---- Xoá theo URL tương đối (không có DB id — xem ghi chú đầu file) ----
        group.MapDelete("/", async (string? url, IFileStorage storage, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(url)) return Results.BadRequest(new { error = "Thiếu tham số url" });
            await storage.DeleteAsync(url, ct);
            return Results.NoContent();
        });
    }
}
