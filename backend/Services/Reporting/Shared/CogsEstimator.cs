using Microsoft.EntityFrameworkCore;
using InventoryModule.Infrastructure;

namespace Reporting.Shared;

/// <summary>
/// W2-16 · phase-54 Requirement 2 — giá vốn hàng bán (COGS): ưu tiên snapshot giá vốn lưu trên
/// từng dòng đơn tại thời điểm bán; KHÔNG có field đó thì rơi về <c>InventoryItem.AverageCost</c>
/// hiện tại và đánh dấu <c>isEstimate: true</c>.
///
/// TRẠNG THÁI THẬT: <c>Sales.Domain.OrderItem</c> (W2-3, ngoài phạm vi sở hữu của track này -
/// chỉ sở hữu <c>backend/Services/Reporting/**</c>) KHÔNG có snapshot giá vốn tại thời điểm bán -
/// mọi COGS tính ở đây LUÔN là ước tính theo giá vốn HIỆN TẠI, dù sản phẩm đã bán từ lâu và giá
/// vốn đã đổi. Xem integration-requests-w2.md: đề nghị W2-3 thêm <c>OrderItem.UnitCostSnapshot</c>.
/// </summary>
public static class CogsEstimator
{
    /// <summary>Giá vốn hiện tại theo <c>ProductId</c>, dùng làm fallback ước tính COGS.</summary>
    public static Task<Dictionary<Guid, decimal>> CurrentUnitCostsAsync(
        InventoryDbContext invDb, IReadOnlyCollection<Guid> productIds, CancellationToken ct = default) =>
        invDb.InventoryItems
            .Where(i => productIds.Contains(i.ProductId))
            .GroupBy(i => i.ProductId)
            // Nhiều kho có thể giữ AverageCost khác nhau cho cùng SKU; lấy bình quân gia quyền
            // theo tồn kho làm đại diện — không có căn cứ nào tốt hơn khi không có snapshot.
            .Select(g => new { ProductId = g.Key, Cost = g.Sum(i => i.QuantityOnHand * i.AverageCost) / (g.Sum(i => i.QuantityOnHand) == 0 ? 1 : g.Sum(i => i.QuantityOnHand)) })
            .ToDictionaryAsync(x => x.ProductId, x => x.Cost, ct);
}
