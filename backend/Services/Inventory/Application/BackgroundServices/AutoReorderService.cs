using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Infrastructure;

namespace InventoryModule.Application.BackgroundServices;

public class AutoReorderService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AutoReorderService> _logger;

    public AutoReorderService(IServiceScopeFactory scopeFactory, ILogger<AutoReorderService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

                var lowStockItems = await db.InventoryItems
                    .Where(i => i.QuantityOnHand <= i.ReorderPoint && i.ReorderQuantity > 0)
                    .ToListAsync(stoppingToken);

                // Log low stock items — in production, create draft POs
                foreach (var item in lowStockItems)
                {
                    _logger.LogInformation(
                        "[AutoReorder] Low stock: Product {ProductId}, Qty: {QuantityOnHand}, Reorder Point: {ReorderPoint}",
                        item.ProductId, item.QuantityOnHand, item.ReorderPoint);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AutoReorder] Error scanning inventory for reorder");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }
}
