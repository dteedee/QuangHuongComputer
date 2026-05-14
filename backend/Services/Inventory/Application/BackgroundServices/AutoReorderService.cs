using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Infrastructure;

namespace InventoryModule.Application.BackgroundServices;

public class AutoReorderService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;

    public AutoReorderService(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
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
                    Console.WriteLine($"[AutoReorder] Low stock: Product {item.ProductId}, Qty: {item.QuantityOnHand}, Reorder Point: {item.ReorderPoint}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AutoReorder] Error: {ex.Message}");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }
}
