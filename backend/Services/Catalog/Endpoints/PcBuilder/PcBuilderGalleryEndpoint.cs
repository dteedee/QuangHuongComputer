using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using Catalog.Application.PcBuilder;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Endpoints.PcBuilder;

public sealed record PromoteGalleryBuildRequest(
    string BuildCode, string Title, string UseCaseTag, int SortOrder = 0, bool IsFeatured = false, bool IsPublic = false);

public sealed record UpdateGalleryBuildRequest(string Title, string UseCaseTag, int SortOrder, bool IsFeatured, bool IsPublic);

/// <summary>
/// "Cấu hình mẫu" /cau-hinh-mau.
///  · GET  /gallery                  — công khai (allow-list GET /api/catalog/**), chỉ bản ghi công khai;
///  · /admin/gallery/**              — Catalog.Manage: xem cả bản ẩn, tạo từ một build đã lưu (theo mã),
///                                     sửa tiêu đề/nhu cầu/thứ tự/nổi bật/công khai, gỡ.
/// Khách không có đường nào đặt IsPublic/IsFeatured: API lưu build của khách không nhận hai cờ này.
/// </summary>
public static class PcBuilderGalleryEndpoint
{
    public static void MapPcBuilderGallery(this IEndpointRouteBuilder app)
    {
        app.MapGet("/gallery", async (string? tag, decimal? minBudget, decimal? maxBudget, CatalogDbContext db, CancellationToken ct)
            => Results.Ok(await PcBuildGalleryQuery.ListAsync(db, tag, minBudget, maxBudget, includeHidden: false, ct)));

        var admin = app.MapGroup("/admin/gallery").RequirePermission(Permissions.Catalog.Manage);

        admin.MapGet("", async (CatalogDbContext db, CancellationToken ct)
            => Results.Ok(await PcBuildGalleryQuery.ListAsync(db, null, null, null, includeHidden: true, ct)));

        admin.MapPost("", async (PromoteGalleryBuildRequest request, CatalogDbContext db, CancellationToken ct) =>
        {
            var code = (request.BuildCode ?? string.Empty).Trim().ToUpperInvariant();
            var source = await db.SavedPcBuilds.Include(b => b.Items).AsNoTracking()
                .FirstOrDefaultAsync(b => b.BuildCode == code, ct);
            if (source == null) throw new RequestValidationException("buildCode", "Không tìm thấy cấu hình với mã này.");

            var copy = Guard(() => SavedPcBuild.CreateGalleryCopy(source, request.Title, request.UseCaseTag, request.SortOrder));
            Guard(() => copy.UpdateGallery(request.Title, request.UseCaseTag, request.SortOrder, request.IsFeatured, request.IsPublic));
            db.SavedPcBuilds.Add(copy);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/catalog/pc-builder/builds/{copy.BuildCode}", new { copy.Id, copy.BuildCode });
        });

        admin.MapPut("/{id:guid}", async (Guid id, UpdateGalleryBuildRequest request, CatalogDbContext db, CancellationToken ct) =>
        {
            var build = await db.SavedPcBuilds.FirstOrDefaultAsync(b => b.Id == id && b.CustomerId == null && b.UseCaseTag != null, ct);
            if (build == null) return Results.NotFound();
            Guard(() => build.UpdateGallery(request.Title, request.UseCaseTag, request.SortOrder, request.IsFeatured, request.IsPublic));
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { build.Id });
        });

        admin.MapDelete("/{id:guid}", async (Guid id, CatalogDbContext db, CancellationToken ct) =>
        {
            var build = await db.SavedPcBuilds.FirstOrDefaultAsync(b => b.Id == id && b.CustomerId == null && b.UseCaseTag != null, ct);
            if (build == null) return Results.NotFound();
            build.IsActive = false; // xoá mềm (query filter IsActive) — link chia sẻ cũ trả 404
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
    }

    /// <summary>Lỗi luật nghiệp vụ của domain → 400 theo hợp đồng lỗi chung.</summary>
    private static T Guard<T>(Func<T> action)
    {
        try { return action(); }
        catch (ArgumentException ex) { throw new RequestValidationException(ex.ParamName ?? "request", ex.Message.Split(" (Parameter")[0]); }
        catch (InvalidOperationException ex) { throw new RequestValidationException("request", ex.Message); }
    }

    private static void Guard(Action action) => Guard(() => { action(); return 0; });
}
