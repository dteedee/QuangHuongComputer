using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Infrastructure;
using InventoryModule.Domain;

namespace InventoryModule.Application.BackgroundServices;

/// <summary>
/// Background service để tự động release các stock reservation đã hết hạn
/// Chạy mỗi 5 phút
/// </summary>
public class ExpiredReservationCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ExpiredReservationCleanupService> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromMinutes(5);

    public ExpiredReservationCleanupService(
        IServiceProvider serviceProvider,
        ILogger<ExpiredReservationCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Expired Reservation Cleanup Service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupExpiredReservations(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while cleaning up expired reservations");
            }

            await Task.Delay(_interval, stoppingToken);
        }

        _logger.LogInformation("Expired Reservation Cleanup Service stopped");
    }

    private async Task CleanupExpiredReservations(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<InventoryDbContext>();

        var now = DateTime.UtcNow;

        // Tìm tất cả reservation đã hết hạn
        var expiredReservations = await dbContext.StockReservations
            .Where(r => r.Status == ReservationStatus.Active && r.ExpiresAt <= now)
            .ToListAsync(cancellationToken);

        if (!expiredReservations.Any())
        {
            _logger.LogDebug("No expired reservations found");
            return;
        }

        _logger.LogInformation("Found {Count} expired reservations to clean up", expiredReservations.Count);

        foreach (var reservation in expiredReservations)
        {
            try
            {
                // Release stock
                var inventoryItem = await dbContext.InventoryItems
                    .FirstOrDefaultAsync(i => i.Id == reservation.InventoryItemId, cancellationToken);

                if (inventoryItem != null)
                {
                    inventoryItem.ReleaseReservedStock(reservation.Quantity);
                    _logger.LogInformation(
                        "Released {Quantity}units of product {ProductId} from expired reservation {ReservationId}",
                        reservation.Quantity, reservation.ProductId, reservation.Id);
                }

                // Mark reservation as expired
                reservation.Expire();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, 
                    "Error releasing reservation {ReservationId} for product {ProductId}",
                    reservation.Id, reservation.ProductId);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Successfully cleaned up {Count} expired reservations", expiredReservations.Count);
    }
}
