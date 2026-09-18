using BuildingBlocks.Messaging.IntegrationEvents;
using Catalog.Infrastructure;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Warranty.Domain;
using Warranty.Infrastructure;

namespace Warranty.Application.Consumers;

/// <summary>
/// W2-6 / D08 (binding): kích hoạt bảo hành khi 1 đơn hoàn tất giao (mọi kênh — online trả trước,
/// COD giao thành công, bán tại quầy) miễn là sự kiện <see cref="OrderFulfilledEvent"/> được publish.
///
/// Đã sửa so với bản cũ:
///  - Số tháng resolve theo <see cref="WarrantyPolicyResolver"/> (Product.WarrantyMonths -> danh
///    mục lá -> cha đệ quy -> DEFAULT) THEO TỪNG SẢN PHẨM, thay vì lấy policy Manufacturer ĐẦU
///    TIÊN toàn cục rồi áp cho mọi dòng hàng.
///  - 0 tháng = không tạo bản ghi bảo hành (D08 §2 — sản phẩm/danh mục từ chối BH tường minh).
///  - Hàng không serial (SerialNumbers.Count &lt; Quantity) vẫn được BH bằng mã tổng hợp
///    <c>QH-{OrderId}-{dòng}-{stt}</c> in trên hóa đơn (D08 §2 — chờ IR-1 gắn OrderNumber thật).
///
/// KNOWN GAP (xem báo cáo w2-6-report.md "Unresolved"): <see cref="OrderFulfilledEvent"/> không
/// có OrderNumber, và chỉ <c>Sales.OrderPaidConsumer</c> publish nó (chỉ kênh online trả trước) —
/// COD giao hàng + bán tại quầy (POS) KHÔNG publish sự kiện này. Cả hai là thay đổi ở module Sales
/// (ngoài ownership Warranty), đã ghi vào integration-requests-w2.md IR-1/IR-2.
/// </summary>
public class OrderFulfilledConsumer : IConsumer<OrderFulfilledEvent>
{
    private readonly WarrantyDbContext _warrantyDb;
    private readonly CatalogDbContext _catalogDb;
    private readonly WarrantyPolicyResolver _resolver;
    private readonly ILogger<OrderFulfilledConsumer> _logger;

    public OrderFulfilledConsumer(
        WarrantyDbContext warrantyDb,
        CatalogDbContext catalogDb,
        WarrantyPolicyResolver resolver,
        ILogger<OrderFulfilledConsumer> logger)
    {
        _warrantyDb = warrantyDb;
        _catalogDb = catalogDb;
        _resolver = resolver;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderFulfilledEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Auto-registering warranties for Order {OrderId}", msg.OrderId);

        // IR-1 (integration-requests-w2.md): OrderFulfilledEvent chưa có OrderNumber. Dùng OrderId
        // làm khoá tra cứu tạm — /lookup/invoice/{orderNumber} sẽ không khớp cho tới khi IR-1 xong.
        var orderNumberFallback = msg.OrderId.ToString("N")[..8].ToUpperInvariant();

        var lineIndex = 0;
        foreach (var item in msg.Items)
        {
            lineIndex++;
            var product = await _catalogDb.Products.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == item.ProductId);
            if (product == null)
            {
                _logger.LogWarning("Product {ProductId} not found for warranty registration", item.ProductId);
                continue;
            }

            foreach (var provider in new[] { WarrantyProvider.Manufacturer, WarrantyProvider.Store })
            {
                var resolution = await _resolver.ResolveAsync(item.ProductId, provider);
                if (resolution.Months <= 0)
                {
                    _logger.LogInformation(
                        "Product {ProductId} provider {Provider}: 0 tháng ({Source}) -> không tạo BH",
                        item.ProductId, provider, resolution.Source);
                    continue;
                }

                // Có serial: 1 bản BH / serial. Không serial: mã tổng hợp / đơn vị còn lại trong Quantity.
                var seq = 0;
                foreach (var serialNumber in item.SerialNumbers)
                {
                    seq++;
                    await RegisterIfMissing(serialNumber, item.ProductId, msg.CustomerId,
                        resolution.Months, provider, resolution.PolicyId, orderNumberFallback);
                }

                var unitsWithoutSerial = item.Quantity - item.SerialNumbers.Count;
                for (var i = 0; i < unitsWithoutSerial; i++)
                {
                    seq++;
                    var compositeCode = $"QH-{orderNumberFallback}-{lineIndex}-{seq}";
                    await RegisterIfMissing(compositeCode, item.ProductId, msg.CustomerId,
                        resolution.Months, provider, resolution.PolicyId, orderNumberFallback);
                }
            }
        }

        await _warrantyDb.SaveChangesAsync();
        _logger.LogInformation("Warranty auto-registration completed for Order {OrderId}", msg.OrderId);
    }

    private async Task RegisterIfMissing(
        string serialOrCode,
        Guid productId,
        Guid customerId,
        int months,
        WarrantyProvider provider,
        Guid? policyId,
        string orderNumber)
    {
        var existing = await _warrantyDb.ProductWarranties
            .FirstOrDefaultAsync(w => w.SerialNumber == serialOrCode && w.Provider == provider);
        if (existing != null)
        {
            _logger.LogInformation("Warranty {Provider} for {SerialOrCode} exists, skip", provider, serialOrCode);
            return;
        }
        var warranty = new ProductWarranty(
            productId: productId,
            serialNumber: serialOrCode,
            customerId: customerId,
            purchaseDate: DateTime.UtcNow,
            warrantyPeriodMonths: months,
            orderNumber: orderNumber,
            provider: provider,
            policyId: policyId);
        _warrantyDb.ProductWarranties.Add(warranty);
        _logger.LogInformation("Registered {Provider} warranty for {SerialOrCode}, expires {ExpirationDate}",
            provider, serialOrCode, warranty.ExpirationDate);
    }
}
