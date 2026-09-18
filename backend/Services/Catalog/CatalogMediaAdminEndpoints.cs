using BuildingBlocks.Security;
using BuildingBlocks.Caching;
using Catalog.Application.Media;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Catalog;

/// <summary>Xoá + sắp xếp lại media - tách khỏi `CatalogMediaEndpoints.cs` để giữ file đó dưới 200 dòng.</summary>
public static class CatalogMediaAdminEndpoints
{
    public static void MapCatalogMediaAdminEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapDelete("/products/{id:guid}/media/{mid:guid}", async (
            Guid id, Guid mid, CatalogDbContext db, ICacheService cache, MediaUploadService uploader, CancellationToken ct) =>
        {
            var media = await db.ProductMedias.FirstOrDefaultAsync(m => m.Id == mid && m.ProductId == id, ct);
            if (media == null) return Results.NotFound();
            var wasPrimary = media.IsPrimary;
            db.ProductMedias.Remove(media);
            await db.SaveChangesAsync(ct);

            // D02: ảnh chính bị xoá -> không còn primary nào -> ImageUrl khử-chuẩn-hoá phải theo
            // (không để lại URL trỏ tới file đã xoá). Không tự đôn ảnh khác lên chính - staff chọn.
            if (wasPrimary && media.Type == MediaType.Image)
                await db.Products.Where(p => p.Id == id)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.ImageUrl, (string?)null), ct);

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

            await CatalogProductHelpers.InvalidateProductCachesAsync(cache, id);
            return Results.NoContent();
        }).RequirePermission(Permissions.Content.ManageMedia);

        // ---- Sắp xếp lại: body { ids: [uuid, uuid, ...] } — vị trí = index ----
        group.MapPost("/products/{id:guid}/media/reorder", async (
            Guid id, CatalogMediaEndpoints.ReorderRequest req, CatalogDbContext db, ICacheService cache, CancellationToken ct) =>
        {
            if (req.Ids == null || req.Ids.Count == 0) return Results.BadRequest();
            var medias = await db.ProductMedias.Where(m => m.ProductId == id).ToListAsync(ct);
            var order = req.Ids.Select((mid, idx) => new { mid, idx }).ToDictionary(x => x.mid, x => x.idx);
            foreach (var m in medias)
                if (order.TryGetValue(m.Id, out var pos)) m.UpdateSortOrder(pos);
            await db.SaveChangesAsync(ct);
            await CatalogProductHelpers.InvalidateProductCachesAsync(cache, id);
            return Results.NoContent();
        }).RequirePermission(Permissions.Content.ManageMedia);
    }
}
