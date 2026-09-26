using BuildingBlocks.Contracts;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Orders;

/// <summary>
/// Cài đặt <see cref="IPurchaseVerificationQuery"/>: một câu EXISTS trên đơn của khách.
/// Chỉ đơn <see cref="OrderStatus.Delivered"/> hoặc <see cref="OrderStatus.Completed"/> mới tính là
/// "đã mua" — đó là hai trạng thái duy nhất khách chắc chắn đã nhận hàng.
/// </summary>
public sealed class PurchaseVerificationQuery : IPurchaseVerificationQuery
{
    private readonly SalesDbContext _db;

    public PurchaseVerificationQuery(SalesDbContext db)
    {
        _db = db;
    }

    public async Task<bool> HasReceivedProductAsync(
        string userId, Guid productId, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(userId, out var customerId) || productId == Guid.Empty)
            return false;

        return await _db.Orders
            .AsNoTracking()
            .AnyAsync(o => o.CustomerId == customerId
                && (o.Status == OrderStatus.Delivered || o.Status == OrderStatus.Completed)
                && o.Items.Any(i => i.ProductId == productId), cancellationToken);
    }
}
