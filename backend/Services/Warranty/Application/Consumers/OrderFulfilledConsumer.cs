using BuildingBlocks.Messaging.IntegrationEvents;
using Catalog.Infrastructure;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Warranty.Domain;
using Warranty.Infrastructure;

namespace Warranty.Application.Consumers;

public class OrderFulfilledConsumer : IConsumer<OrderFulfilledEvent>
{
    private readonly WarrantyDbContext _warrantyDb;
    private readonly CatalogDbContext _catalogDb;
    private readonly ILogger<OrderFulfilledConsumer> _logger;

    public OrderFulfilledConsumer(
        WarrantyDbContext warrantyDb,
        CatalogDbContext catalogDb,
        ILogger<OrderFulfilledConsumer> logger)
    {
        _warrantyDb = warrantyDb;
        _catalogDb = catalogDb;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderFulfilledEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Auto-registering warranties for Order {OrderId}", msg.OrderId);

        // Phase 07: policy Manufacturer + Store song song — chọn từ WarrantyPolicy trong DB nếu có.
        // Fallback mặc định: Manufacturer 12 tháng.
        var manufacturerPolicy = await _warrantyDb.Policies
            .FirstOrDefaultAsync(p => p.Provider == WarrantyProvider.Manufacturer);
        var storePolicy = await _warrantyDb.Policies
            .FirstOrDefaultAsync(p => p.Provider == WarrantyProvider.Store);

        foreach (var item in msg.Items)
        {
            var product = await _catalogDb.Products.FindAsync(item.ProductId);
            if (product == null)
            {
                _logger.LogWarning("Product {ProductId} not found for warranty registration", item.ProductId);
                continue;
            }

            var mfrMonths = manufacturerPolicy?.DurationMonths ?? 12;
            var storeMonths = storePolicy?.DurationMonths ?? 0; // 0 = không tạo bản Store

            foreach (var serialNumber in item.SerialNumbers)
            {
                // Idempotency: 1 máy có 2 warranty song song (Manufacturer + Store).
                // Kiểm tra theo (SerialNumber, Provider).
                await RegisterIfMissing(serialNumber, item.ProductId, msg.CustomerId,
                    mfrMonths, WarrantyProvider.Manufacturer, manufacturerPolicy?.Id);

                if (storeMonths > 0)
                {
                    await RegisterIfMissing(serialNumber, item.ProductId, msg.CustomerId,
                        storeMonths, WarrantyProvider.Store, storePolicy?.Id);
                }
            }
        }

        await _warrantyDb.SaveChangesAsync();
        _logger.LogInformation("Warranty auto-registration completed for Order {OrderId}", msg.OrderId);
    }

    private async Task RegisterIfMissing(
        string serialNumber,
        Guid productId,
        Guid customerId,
        int months,
        WarrantyProvider provider,
        Guid? policyId)
    {
        var existing = await _warrantyDb.ProductWarranties
            .FirstOrDefaultAsync(w => w.SerialNumber == serialNumber && w.Provider == provider);
        if (existing != null)
        {
            _logger.LogInformation("Warranty {Provider} for SN {SerialNumber} exists, skip", provider, serialNumber);
            return;
        }
        var warranty = new ProductWarranty(
            productId: productId,
            serialNumber: serialNumber,
            customerId: customerId,
            purchaseDate: DateTime.UtcNow,
            warrantyPeriodMonths: months,
            provider: provider,
            policyId: policyId);
        _warrantyDb.ProductWarranties.Add(warranty);
        _logger.LogInformation("Registered {Provider} warranty for SN {SerialNumber}, expires {ExpirationDate}",
            provider, serialNumber, warranty.ExpirationDate);
    }
}
