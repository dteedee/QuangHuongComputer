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

        foreach (var item in msg.Items)
        {
            // Fetch product to get warranty period
            var product = await _catalogDb.Products.FindAsync(item.ProductId);
            if (product == null)
            {
                _logger.LogWarning("Product {ProductId} not found for warranty registration", item.ProductId);
                continue;
            }

            // Default warranty: 12 months for all products (can be made configurable per product)
            var warrantyMonths = 12;

            foreach (var serialNumber in item.SerialNumbers)
            {
                // Check if warranty already exists (idempotency)
                var existing = await _warrantyDb.ProductWarranties
                    .FirstOrDefaultAsync(w => w.SerialNumber == serialNumber);

                if (existing != null)
                {
                    _logger.LogInformation("Warranty for SN {SerialNumber} already exists, skipping", serialNumber);
                    continue;
                }

                var warranty = new ProductWarranty(
                    item.ProductId,
                    serialNumber,
                    msg.CustomerId,
                    DateTime.UtcNow,
                    warrantyMonths
                );

                _warrantyDb.ProductWarranties.Add(warranty);
                _logger.LogInformation("Registered warranty for SN {SerialNumber}, expires {ExpirationDate}", 
                    serialNumber, warranty.ExpirationDate);
            }
        }

        await _warrantyDb.SaveChangesAsync();
        _logger.LogInformation("Warranty auto-registration completed for Order {OrderId}", msg.OrderId);
    }
}
