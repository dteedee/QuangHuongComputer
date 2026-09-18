using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Application.Purchasing;

/// <summary>
/// Những gì Inventory cần biết về một sản phẩm khi nhập kho: có tồn tại không, tên/SKU để chụp
/// snapshot lên chứng từ, có theo dõi serial không (<c>Category.IsSerialTracked</c> — không có cờ
/// riêng theo sản phẩm) và số tháng bảo hành mặc định (D08).
/// </summary>
/// <param name="ProductId">Sản phẩm.</param>
/// <param name="Name">Tên tại thời điểm nhập — chụp lên GRN/PO để chứng từ cũ không đổi theo catalog.</param>
/// <param name="Sku">Mã SKU tại thời điểm nhập.</param>
/// <param name="IsSerialTracked">Danh mục yêu cầu khai báo serial từng máy.</param>
/// <param name="WarrantyMonths">Số tháng bảo hành mặc định của sản phẩm (D08), 12 nếu không khai.</param>
public sealed record ProductReceiptFacts(
    Guid ProductId,
    string Name,
    string Sku,
    bool IsSerialTracked,
    int WarrantyMonths);

/// <summary>Tra cứu <see cref="ProductReceiptFacts"/> theo lô — một query cho cả phiếu.</summary>
public sealed class GoodsReceiptCatalogFacts
{
    private const int DefaultWarrantyMonths = 12;

    private readonly CatalogDbContext _catalog;

    public GoodsReceiptCatalogFacts(CatalogDbContext catalog) => _catalog = catalog;

    /// <summary>
    /// Đọc một lần cho mọi sản phẩm của phiếu. Sản phẩm không tồn tại thì KHÔNG có mặt trong kết
    /// quả — caller phải coi đó là lỗi dữ liệu và trả 400, chứ không tự bịa tên.
    /// </summary>
    public async Task<IReadOnlyDictionary<Guid, ProductReceiptFacts>> LoadAsync(
        IReadOnlyCollection<Guid> productIds, CancellationToken ct = default)
    {
        if (productIds.Count == 0)
            return new Dictionary<Guid, ProductReceiptFacts>();

        var rows = await (from p in _catalog.Products.AsNoTracking()
                          join c in _catalog.Categories.AsNoTracking() on p.CategoryId equals c.Id into cats
                          from c in cats.DefaultIfEmpty()
                          where productIds.Contains(p.Id)
                          select new
                          {
                              p.Id,
                              p.Name,
                              p.Sku,
                              IsSerialTracked = c != null && c.IsSerialTracked,
                              p.WarrantyMonths
                          })
                         .ToListAsync(ct);

        return rows.ToDictionary(
            r => r.Id,
            r => new ProductReceiptFacts(
                r.Id,
                r.Name,
                r.Sku,
                r.IsSerialTracked,
                r.WarrantyMonths is > 0 ? r.WarrantyMonths.Value : DefaultWarrantyMonths));
    }
}
