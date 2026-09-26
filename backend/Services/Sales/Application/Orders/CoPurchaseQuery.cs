using BuildingBlocks.Contracts;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Orders;

/// <summary>
/// Cài đặt <see cref="ICoPurchaseQuery"/>: MỘT câu GROUP BY trên dòng đơn.
///
/// Hình dạng SQL (Postgres):
/// <code>
/// SELECT i2."ProductId", COUNT(DISTINCT o."Id"), MAX(o."OrderDate")
/// FROM "Orders" o JOIN "OrderItem" i2 ON i2."OrderId" = o."Id"
/// WHERE o.&lt;đơn hợp lệ trong cửa sổ&gt;
///   AND EXISTS (SELECT 1 FROM "OrderItem" i1 WHERE i1."OrderId" = o."Id" AND i1."ProductId" = @anchor ...)
///   AND i2."ProductId" &lt;&gt; @anchor AND NOT i2."IsGift"
/// GROUP BY i2."ProductId" HAVING COUNT(DISTINCT o."Id") &gt;= @min
/// ORDER BY 2 DESC, 3 DESC LIMIT @take
/// </code>
/// Index đã có sẵn đủ dùng, không cần migration: <c>ix_order_item_product_id</c> tìm các dòng của
/// sản phẩm gốc, PK <c>Orders(Id)</c> lọc trạng thái/ngày, PK <c>OrderItem(OrderId, Id)</c> lấy các
/// dòng cùng đơn. Chi phí tỉ lệ với số đơn CHỨA sản phẩm gốc, không với tổng số dòng đơn.
/// </summary>
public sealed class CoPurchaseQuery : ICoPurchaseQuery
{
    private readonly SalesDbContext _db;

    public CoPurchaseQuery(SalesDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<CoPurchaseCount>> GetCoPurchasedAsync(
        Guid productId, TimeSpan window, int minOrders, int take, CancellationToken cancellationToken = default)
    {
        if (productId == Guid.Empty || take <= 0) return Array.Empty<CoPurchaseCount>();

        var since = DateTime.UtcNow - window;
        var threshold = Math.Max(1, minOrders);

        var rows = await CountedOrders(since)
            .Where(o => o.Items.Any(i => i.ProductId == productId && !i.IsGift))
            .SelectMany(o => o.Items
                .Where(i => i.ProductId != productId && !i.IsGift)
                .Select(i => new { OrderId = o.Id, o.OrderDate, i.ProductId }))
            .GroupBy(x => x.ProductId)
            .Select(g => new
            {
                ProductId = g.Key,
                Orders = g.Select(x => x.OrderId).Distinct().Count(),
                LastOrderedAt = g.Max(x => x.OrderDate),
            })
            .Where(x => x.Orders >= threshold)
            .OrderByDescending(x => x.Orders)
            .ThenByDescending(x => x.LastOrderedAt)
            .ThenBy(x => x.ProductId)
            .Take(take)
            .ToListAsync(cancellationToken);

        return rows.Select(r => new CoPurchaseCount(r.ProductId, r.Orders)).ToList();
    }

    /// <summary>
    /// Đơn được tính là "đã mua thật": web đã giao/hoàn tất, POS đã bàn giao tại quầy.
    /// Viết tường minh từng trạng thái — đơn huỷ (và mọi trạng thái chưa chốt) tự động bị loại.
    /// </summary>
    private IQueryable<Order> CountedOrders(DateTime since) =>
        _db.Orders.AsNoTracking().Where(o => o.OrderDate >= since
            && (o.Status == OrderStatus.Delivered
                || o.Status == OrderStatus.Completed
                || (o.Channel == OrderChannels.Pos && o.Status == OrderStatus.Fulfilled)));
}
