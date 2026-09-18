using BuildingBlocks.Messaging.IntegrationEvents;
using Catalog.Infrastructure;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Catalog.Application.Consumers;

/// <summary>
/// Step 5: "consume StockChanged (W2-5 publishes) to project Products.StockQuantity".
/// `StockChangedEvent(ProductId, WarehouseId, QuantityOnHand, Delta, OccurredOn)` - `Delta` là
/// biến thiên (có thể nhiều kho), nên cộng dồn bằng MỘT `ExecuteUpdate` nguyên tử (không
/// load-modify-save, tránh mất cập nhật khi hai kho báo cùng lúc).
///
/// GHI CHÚ (chưa làm): `Product.Status` (InStock/LowStock/OutOfStock) KHÔNG được tính lại ở đây -
/// event chỉ mang StockQuantity theo yêu cầu của step 5 phase file, tính lại Status đúng luật
/// (ngưỡng &gt;10/&gt;0/0 - Domain/Product.cs DetermineStatus) cần nhân bản logic ra SQL hoặc tách
/// riêng; để lại cho lần sau, ghi trong "Unresolved" của báo cáo track.
///
/// ĐĂNG KÝ CÒN THIẾU (integration request): `ServiceRegistration.cs` chỉ quét 5 assembly cho
/// `x.AddConsumers(...)` (Communication, Sales, Accounting, Warranty, Identity) - Catalog KHÔNG
/// nằm trong danh sách đó nên consumer này chưa được MassTransit tự nối dây cho tới khi assembly
/// Catalog được thêm vào (file đó nằm ngoài sở hữu track này).
/// </summary>
public class StockChangedConsumer : IConsumer<StockChangedEvent>
{
    private readonly CatalogDbContext _db;
    private readonly ILogger<StockChangedConsumer> _logger;

    public StockChangedConsumer(CatalogDbContext db, ILogger<StockChangedConsumer> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<StockChangedEvent> context)
    {
        var msg = context.Message;
        var affected = await _db.Products.IgnoreQueryFilters()
            .Where(p => p.Id == msg.ProductId)
            .ExecuteUpdateAsync(
                s => s.SetProperty(p => p.StockQuantity, p => p.StockQuantity + msg.Delta),
                context.CancellationToken);

        if (affected == 0)
            _logger.LogWarning("StockChangedEvent cho ProductId {ProductId} không khớp sản phẩm nào trong Catalog", msg.ProductId);
    }
}
