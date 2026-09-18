namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

/// <summary>
/// D10: lịch sử thay đổi giá bán / giá vốn. MỘT VÀ CHỈ MỘT nơi ghi bảng này -
/// `CatalogDbContext.SaveChanges` (hook so sánh giá trị cũ/mới của Product đang bị Modified).
/// Không endpoint nào tự thêm dòng vào đây; chúng chỉ đặt `PriceChangeContext.Source` trước khi
/// gọi SaveChanges (vd "Manual", "BulkPrice" của W2-22, "Import").
/// </summary>
public class ProductPriceChange : Entity<Guid>
{
    public Guid ProductId { get; private set; }
    public decimal OldPrice { get; private set; }
    public decimal NewPrice { get; private set; }
    public decimal OldCostPrice { get; private set; }
    public decimal NewCostPrice { get; private set; }

    /// <summary>Nguồn thay đổi: "Manual" | "BulkPrice" | "Import" | ... - tự do, chỉ để lọc/báo cáo.</summary>
    public string Source { get; private set; } = "Manual";

    /// <summary>Id người thao tác (chuỗi - khớp kiểu `CreatedBy`/`UpdatedBy` dùng chung trong module).</summary>
    public string? ActorId { get; private set; }

    public DateTime At { get; private set; }

    protected ProductPriceChange() { }

    public ProductPriceChange(
        Guid productId,
        decimal oldPrice,
        decimal newPrice,
        decimal oldCostPrice,
        decimal newCostPrice,
        string source,
        string? actorId)
    {
        Id = Guid.NewGuid();
        ProductId = productId;
        OldPrice = oldPrice;
        NewPrice = newPrice;
        OldCostPrice = oldCostPrice;
        NewCostPrice = newCostPrice;
        Source = string.IsNullOrWhiteSpace(source) ? "Manual" : source;
        ActorId = actorId;
        At = DateTime.UtcNow;
    }
}
