using BuildingBlocks.Contracts;
using Catalog.Domain;
using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Application.Products;

/// <summary>Một gợi ý "thường được mua cùng". <c>OrderCount = 0</c> khi đến từ nguồn dự phòng.</summary>
public sealed record BoughtTogetherItem(ProductDto Product, int OrderCount);

/// <summary>
/// Kết quả khối "Thường được mua cùng".
/// <c>Source</c>: <c>"co-purchase"</c> (dữ liệu đơn thật) hoặc <c>"related"</c> (dự phòng cùng
/// danh mục/thương hiệu khi chưa đủ dữ liệu). <c>Total</c> = giá sản phẩm gốc + mọi gợi ý, tính ở
/// server để FE không tự cộng giá mặc định.
/// </summary>
public sealed record BoughtTogetherResult(
    string Source, ProductDto Anchor, IReadOnlyList<BoughtTogetherItem> Items, decimal Total);

/// <summary>
/// Ghép số đếm mua kèm của Sales (<see cref="ICoPurchaseQuery"/>) với catalog công khai.
///
/// Chỉ trả sản phẩm ĐÃ ĐĂNG WEB (D10), CÒN HÀNG và KHÔNG có biến thể (thêm vào giỏ một chạm được —
/// sản phẩm có biến thể bắt khách chọn trước, không hợp với nút "Thêm tất cả").
/// </summary>
public sealed class BoughtTogetherService
{
    public const string SourceCoPurchase = "co-purchase";
    public const string SourceRelated = "related";

    /// <summary>Cửa sổ dữ liệu: 180 ngày gần nhất.</summary>
    public static readonly TimeSpan Window = TimeSpan.FromDays(180);

    /// <summary>Một cặp phải xuất hiện ở ít nhất 2 đơn khác nhau — 1 đơn lẻ là nhiễu, không phải xu hướng.</summary>
    public const int MinSharedOrders = 2;

    /// <summary>Dưới 2 gợi ý đạt chuẩn thì coi là "chưa đủ dữ liệu" và chuyển sang nguồn dự phòng.</summary>
    public const int MinCoPurchaseItems = 2;

    public const int DefaultLimit = 6;
    public const int MaxLimit = 12;

    private readonly CatalogDbContext _db;
    private readonly ICoPurchaseQuery _coPurchase;

    public BoughtTogetherService(CatalogDbContext db, ICoPurchaseQuery coPurchase)
    {
        _db = db;
        _coPurchase = coPurchase;
    }

    public static int ClampLimit(int? limit) =>
        limit is null or <= 0 ? DefaultLimit : Math.Min(limit.Value, MaxLimit);

    /// <returns>null khi sản phẩm gốc không tồn tại hoặc chưa đăng web.</returns>
    public async Task<BoughtTogetherResult?> GetAsync(Guid productId, int limit, CancellationToken ct = default)
    {
        var anchor = await _db.Products.WherePublished().AsNoTracking()
            .Include(p => p.Category).Include(p => p.Brand)
            .FirstOrDefaultAsync(p => p.Id == productId, ct);
        if (anchor is null) return null;

        // Lấy dư ứng viên: một phần sẽ rơi vì hết hàng/chưa đăng web/có biến thể.
        var counts = await _coPurchase.GetCoPurchasedAsync(
            productId, Window, MinSharedOrders, Math.Min(limit * 4, 60), ct);

        var picked = await PickFromCoPurchaseAsync(counts, limit, ct);
        var source = SourceCoPurchase;
        if (picked.Count < MinCoPurchaseItems)
        {
            source = SourceRelated;
            picked = (await RelatedAsync(anchor, limit, ct)).Select(p => (p, 0)).ToList();
        }

        var thumbs = await ProductDtoProjection.LoadPrimaryMediaAsync(
            _db, picked.Select(x => x.Product.Id).Append(anchor.Id).ToList(), ct);
        ProductDto ToDto(Product p) =>
            ProductDtoProjection.ToDto(p, thumbs.GetValueOrDefault(p.Id).Thumb ?? thumbs.GetValueOrDefault(p.Id).Url);

        var items = picked.Select(x => new BoughtTogetherItem(ToDto(x.Product), x.OrderCount)).ToList();
        var total = anchor.Price + items.Sum(i => i.Product.Price);
        return new BoughtTogetherResult(source, ToDto(anchor), items, total);
    }

    private async Task<List<(Product Product, int OrderCount)>> PickFromCoPurchaseAsync(
        IReadOnlyList<CoPurchaseCount> counts, int limit, CancellationToken ct)
    {
        if (counts.Count == 0) return new();

        var ids = counts.Select(c => c.ProductId).ToList();
        var sellable = await Sellable()
            .Where(p => ids.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, ct);

        // Giữ đúng thứ hạng của Sales, bỏ những món không bán được trên web lúc này.
        return counts
            .Where(c => sellable.ContainsKey(c.ProductId))
            .Take(limit)
            .Select(c => (sellable[c.ProductId], c.OrderCount))
            .ToList();
    }

    /// <summary>Dự phòng: cùng quy tắc với <c>/related</c> (cùng danh mục trước, rồi cùng thương hiệu).</summary>
    private Task<List<Product>> RelatedAsync(Product anchor, int limit, CancellationToken ct) =>
        Sellable()
            .Where(p => p.Id != anchor.Id)
            .Where(p => p.CategoryId == anchor.CategoryId || p.BrandId == anchor.BrandId)
            .OrderByDescending(p => p.CategoryId == anchor.CategoryId)
            .ThenByDescending(p => p.SoldCount)
            .ThenByDescending(p => p.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

    private IQueryable<Product> Sellable() =>
        _db.Products.WherePublished().AsNoTracking()
            .Include(p => p.Category).Include(p => p.Brand)
            .Where(p => p.StockQuantity > 0)
            .Where(p => !_db.ProductVariants.Any(v => v.ProductId == p.Id));
}
