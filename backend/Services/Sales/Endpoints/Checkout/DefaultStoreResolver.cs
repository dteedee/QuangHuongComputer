using Microsoft.EntityFrameworkCore;
using Sales.Infrastructure;

namespace Sales.Endpoints.Checkout;

/// <summary>
/// Tra cửa hàng mặc định cho đơn bán tại quầy khi request không nói rõ cửa hàng nào
/// (đường cũ <c>/api/sales/staff-checkout</c>, có trước khi POS thật của W2-10 ra đời).
///
/// Đọc thẳng <c>config."Stores"</c> bằng SQL: bảng thuộc module SystemConfig, nhưng toàn hệ thống
/// dùng CHUNG một database nên đây là một lần đọc, không tạo phụ thuộc biên dịch giữa hai module.
///
/// KHÔNG bịa mã cửa hàng. Chưa khai báo cửa hàng nào ⇒ trả null và endpoint từ chối đơn với thông
/// báo rõ ràng; một GUID bịa sẽ làm mọi báo cáo doanh thu theo cửa hàng sai vĩnh viễn.
/// </summary>
internal static class DefaultStoreResolver
{
    public static async Task<Guid?> ResolveAsync(SalesDbContext db, CancellationToken ct)
    {
        var stores = await db.Database
            .SqlQueryRaw<Guid>(
                @"SELECT ""Id"" AS ""Value"" FROM config.""Stores""
                  WHERE ""IsActive"" IS NOT FALSE
                  ORDER BY ""CreatedAt"" LIMIT 1")
            .ToListAsync(ct);

        return stores.Count > 0 ? stores[0] : null;
    }
}
