namespace Catalog.Application.PriceHistory;

/// <summary>
/// Scoped per-request. Endpoint ghi giá đặt <see cref="Source"/> (và tuỳ chọn <see cref="ActorId"/>)
/// TRƯỚC khi gọi <c>SaveChangesAsync</c>; <c>CatalogDbContext</c> đọc nó trong hook so sánh giá cũ/mới
/// để biết ghi <c>ProductPriceChanges.Source</c> là gì. Không đặt -> mặc định "Manual".
/// Đây là API DUY NHẤT bên ngoài dùng để tác động tới lịch sử giá - không endpoint nào tự
/// <c>db.ProductPriceChanges.Add(...)</c> (D10: một và chỉ một nơi ghi bảng này).
/// </summary>
public class PriceChangeContext
{
    public string? Source { get; set; }
    public string? ActorId { get; set; }
}
