using BuildingBlocks.Security;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Caching;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Catalog.Domain;
using Catalog.Infrastructure;

namespace Catalog;

/// <summary>
/// D10: "lên web" là một hành động tường minh, tách khỏi `IsActive` (đó là bật/tắt bán hàng ở
/// MỌI kênh). Publish bị chặn nếu sản phẩm chưa có ảnh nào - PDP không ảnh là trải nghiệm hỏng.
/// Tách khỏi `CatalogProductAdminEndpoints.cs` để giữ file đó dưới 200 dòng.
/// </summary>
public static class CatalogProductPublishEndpoints
{
    public static void MapCatalogProductPublishEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapPost("/products/{id:guid}/publish", async (
            Guid id, CatalogDbContext db, ICacheService cache, HttpContext httpContext, CancellationToken ct) =>
        {
            var product = await CatalogProductHelpers.LoadProductAsync(db, id, includeInactive: true, tracking: true);
            if (product == null) return Results.NotFound(new { Error = "Product not found" });

            var hasImage = !string.IsNullOrWhiteSpace(product.ImageUrl)
                || await db.ProductMedias.AnyAsync(m => m.ProductId == id && m.Type == MediaType.Image, ct);
            if (!hasImage)
                return Results.BadRequest(new { error = "Cần ít nhất 1 ảnh trước khi đăng sản phẩm lên web" });

            product.Publish();
            await db.SaveChangesAsync(ct);
            await httpContext.LogAuditAsync("Publish", "Product", id.ToString(), $"Name: {product.Name}");
            await CatalogProductHelpers.InvalidateProductCachesAsync(cache, id);
            return Results.Ok(new { message = "Đã đăng sản phẩm lên web", publishedAt = product.PublishedAt });
        }).RequireAuthorization(Permissions.Catalog.Edit);

        group.MapPost("/products/{id:guid}/unpublish", async (
            Guid id, CatalogDbContext db, ICacheService cache, HttpContext httpContext, CancellationToken ct) =>
        {
            var product = await CatalogProductHelpers.LoadProductAsync(db, id, includeInactive: true, tracking: true);
            if (product == null) return Results.NotFound(new { Error = "Product not found" });

            product.Unpublish();
            await db.SaveChangesAsync(ct);
            await httpContext.LogAuditAsync("Unpublish", "Product", id.ToString(), $"Name: {product.Name}");
            await CatalogProductHelpers.InvalidateProductCachesAsync(cache, id);
            return Results.Ok(new { message = "Đã gỡ sản phẩm khỏi web (vẫn bán được ở POS/báo giá/kho)" });
        }).RequireAuthorization(Permissions.Catalog.Edit);
    }
}
