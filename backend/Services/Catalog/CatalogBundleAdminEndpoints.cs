using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using Catalog.Application.Bundles;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Catalog;

/// <summary>
/// Trình soạn combo của back office: danh sách (kể cả combo tắt/hết hạn), tạo, sửa, bật/tắt, xoá.
/// Mọi route mang quyền Catalog.* — không route nào công khai.
/// </summary>
public static class CatalogBundleAdminEndpoints
{
    public static void MapCatalogBundleAdminEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/admin", async (CatalogDbContext db, CancellationToken ct) =>
        {
            var bundles = await db.ProductBundles.IgnoreQueryFilters().Include(b => b.Items).AsNoTracking()
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync(ct);
            return Results.Ok(await BundleViewBuilder.BuildAsync(db, bundles, ct));
        }).RequirePermission(Permissions.Catalog.View);

        group.MapGet("/admin/{id:guid}", async (Guid id, CatalogDbContext db, CancellationToken ct) =>
        {
            var bundle = await LoadAsync(db, id, tracked: false, ct);
            if (bundle == null) return Results.NotFound();
            return Results.Ok((await BundleViewBuilder.BuildAsync(db, new[] { bundle }, ct))[0]);
        }).RequirePermission(Permissions.Catalog.View);

        group.MapPost("/", async (CreateBundleRequest request, CatalogDbContext db, CancellationToken ct) =>
        {
            var prices = await BundleRequestRules.ValidateAsync(db, request, ct);
            var bundle = new ProductBundle(request.Name, request.Description ?? string.Empty,
                request.TotalPrice, BundleRequestRules.ListTotal(request, prices), request.ImageUrl,
                request.ValidFrom, request.ValidTo, request.DiscountPercent);
            if (request.IsActive == false) bundle.SetActive(false);
            foreach (var item in request.Items)
                bundle.AddItem(item.ProductId, item.IsMainItem, item.Quantity, prices[item.ProductId]);

            db.ProductBundles.Add(bundle);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/catalog/bundles/admin/{bundle.Id}", new { bundle.Id });
        }).RequirePermission(Permissions.Catalog.Create);

        group.MapPut("/{id:guid}", async (Guid id, CreateBundleRequest request, CatalogDbContext db, CancellationToken ct) =>
        {
            var bundle = await LoadAsync(db, id, tracked: true, ct);
            if (bundle == null) return Results.NotFound();

            var prices = await BundleRequestRules.ValidateAsync(db, request, ct);
            bundle.UpdateDetails(request.Name, request.Description ?? string.Empty, request.TotalPrice,
                BundleRequestRules.ListTotal(request, prices), request.ImageUrl,
                request.ValidFrom, request.ValidTo, request.DiscountPercent);
            if (request.IsActive.HasValue) bundle.SetActive(request.IsActive.Value);

            bundle.ClearItems();
            foreach (var item in request.Items)
                bundle.AddItem(item.ProductId, item.IsMainItem, item.Quantity, prices[item.ProductId]);

            await db.SaveChangesAsync(ct);
            return Results.Ok(new { bundle.Id });
        }).RequirePermission(Permissions.Catalog.Edit);

        group.MapPatch("/{id:guid}/active", async (Guid id, SetBundleActiveRequest request, CatalogDbContext db, CancellationToken ct) =>
        {
            var bundle = await LoadAsync(db, id, tracked: true, ct);
            if (bundle == null) return Results.NotFound();
            bundle.SetActive(request.IsActive);
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { bundle.Id, bundle.IsActive });
        }).RequirePermission(Permissions.Catalog.Edit);

        group.MapDelete("/{id:guid}", async (Guid id, CatalogDbContext db, CancellationToken ct) =>
        {
            var bundle = await LoadAsync(db, id, tracked: true, ct);
            if (bundle == null) return Results.NotFound();
            db.ProductBundles.Remove(bundle);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        }).RequirePermission(Permissions.Catalog.Delete);
    }

    private static Task<ProductBundle?> LoadAsync(CatalogDbContext db, Guid id, bool tracked, CancellationToken ct)
    {
        var query = db.ProductBundles.IgnoreQueryFilters().Include(b => b.Items).AsQueryable();
        if (!tracked) query = query.AsNoTracking();
        return query.FirstOrDefaultAsync(b => b.Id == id, ct);
    }
}

/// <summary>Luật lưu combo — lỗi trả 400 theo hợp đồng lỗi chung (<see cref="RequestValidationException"/>).</summary>
internal static class BundleRequestRules
{
    public const int MaxItems = 10;

    /// <summary>Kiểm tra request và trả giá lẻ hiện hành của từng sản phẩm.</summary>
    public static async Task<Dictionary<Guid, decimal>> ValidateAsync(CatalogDbContext db, CreateBundleRequest r, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) throw new RequestValidationException("name", "Tên combo là bắt buộc.");
        if (r.Items == null || r.Items.Count == 0) throw new RequestValidationException("items", "Combo cần ít nhất một sản phẩm.");
        if (r.Items.Count > MaxItems) throw new RequestValidationException("items", $"Combo tối đa {MaxItems} sản phẩm.");
        if (r.Items.Any(i => i.Quantity is < 1 or > 20))
            throw new RequestValidationException("items", "Số lượng mỗi món từ 1 đến 20.");
        if (r.Items.Select(i => i.ProductId).Distinct().Count() != r.Items.Count)
            throw new RequestValidationException("items", "Mỗi sản phẩm chỉ xuất hiện một lần trong combo.");
        if (r.Items.Sum(i => i.Quantity) < 2)
            throw new RequestValidationException("items", "Combo phải có ít nhất 2 sản phẩm (hoặc 1 sản phẩm số lượng 2).");
        if (r.ValidFrom.HasValue && r.ValidTo.HasValue && r.ValidTo <= r.ValidFrom)
            throw new RequestValidationException("validTo", "Ngày kết thúc phải sau ngày bắt đầu.");
        if (!string.IsNullOrWhiteSpace(r.ImageUrl) && !r.ImageUrl.StartsWith("/media/", StringComparison.Ordinal))
            throw new RequestValidationException("imageUrl", "Ảnh combo phải được tải lên kho media của cửa hàng.");

        var ids = r.Items.Select(i => i.ProductId).ToList();
        var prices = await db.Products.AsNoTracking().Where(p => ids.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Price, ct);
        var missing = ids.Where(id => !prices.ContainsKey(id)).ToList();
        if (missing.Count > 0)
            throw new RequestValidationException("items", $"Không tìm thấy sản phẩm: {string.Join(", ", missing)}.");

        var listTotal = ListTotal(r, prices);
        if (r.DiscountPercent is > 0m)
        {
            if (r.DiscountPercent >= 100m)
                throw new RequestValidationException("discountPercent", "Phần trăm giảm phải nhỏ hơn 100.");
        }
        else if (r.TotalPrice <= 0m || r.TotalPrice >= listTotal)
        {
            throw new RequestValidationException("totalPrice",
                $"Giá combo phải lớn hơn 0 và nhỏ hơn tổng giá lẻ ({listTotal:N0}₫).");
        }

        return prices;
    }

    public static decimal ListTotal(CreateBundleRequest r, IReadOnlyDictionary<Guid, decimal> prices)
        => r.Items.Sum(i => prices.TryGetValue(i.ProductId, out var p) ? p * i.Quantity : 0m);
}

public record CreateBundleRequest(
    string Name,
    string? Description,
    decimal TotalPrice,
    decimal OriginalPrice,
    string? ImageUrl,
    DateTime? ValidFrom,
    DateTime? ValidTo,
    List<CreateBundleItemRequest> Items,
    decimal? DiscountPercent = null,
    bool? IsActive = null);

public record CreateBundleItemRequest(
    Guid ProductId,
    bool IsMainItem,
    int Quantity,
    decimal DiscountPercentage = 0m);

public record SetBundleActiveRequest(bool IsActive);
