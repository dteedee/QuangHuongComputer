using Catalog.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// D08 — số tháng bảo hành của một serial mới. Lấy từ <c>Product.WarrantyMonths</c> thay cho hằng
/// 12 cũ, vì <c>SerialNumber.Sell()</c> tính <c>WarrantyEndDate</c> từ đúng trường này: để hai bên
/// lệch nhau là cho một chiếc máy hai ngày hết bảo hành khác nhau.
/// </summary>
internal static class SerialWarrantyMonths
{
    /// <summary>Số tháng mặc định khi cả sản phẩm lẫn request đều không nói gì.</summary>
    private const int Fallback = 12;

    /// <summary>D08: số tháng bảo hành theo sản phẩm; request chỉ ghi đè khi truyền giá trị dương.</summary>
    internal static async Task<int> ResolveAsync(
        CatalogDbContext catalogDb, Guid productId, int? requested, CancellationToken ct)
    {
        if (requested is > 0) return requested.Value;

        var months = await catalogDb.Products
            .Where(p => p.Id == productId)
            .Select(p => p.WarrantyMonths)
            .FirstOrDefaultAsync(ct);

        return months is > 0 ? months.Value : Fallback;
    }
}
