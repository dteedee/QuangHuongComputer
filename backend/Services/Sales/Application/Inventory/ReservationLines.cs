using Sales.Domain;

namespace Sales.Application.Inventory;

/// <summary>
/// Dòng giữ chỗ từ giỏ hàng, GỘP theo (ProductId, VariantId).
///
/// Bắt buộc từ khi có combo: cùng một sản phẩm có thể nằm ở một dòng lẻ VÀ một dòng combo.
/// <see cref="InventoryReservationService.ReserveAsync"/> điều chỉnh giữ chỗ theo khoá
/// (ProductId, VariantId) — đưa hai dòng cùng khoá vào thì dòng sau "điều chỉnh" đè dòng trước
/// và giữ chỗ thiếu hàng. Gộp trước ⇒ mỗi khoá đúng một dòng với tổng số lượng.
/// </summary>
public static class ReservationLines
{
    public static IReadOnlyList<ReservationLine> FromCart(IEnumerable<CartItem> items)
        => items.Where(i => !i.IsGift)
            .GroupBy(i => (i.ProductId, i.VariantId))
            .Select(g => new ReservationLine(g.Key.ProductId, g.Key.VariantId, g.Sum(i => i.Quantity), g.First().ProductName))
            .ToList();
}
