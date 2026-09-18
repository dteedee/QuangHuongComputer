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
        // W2-5: nhả giữ chỗ cũng là một thay đổi tồn kho — phải đi qua sổ cái để có bút toán
        // "Released" kèm người thực hiện (ở đây là chính job này), thay vì sửa lén ReservedQuantity.
        var ledger = scope.ServiceProvider
            .GetRequiredService<InventoryModule.Application.Stock.IStockLedger>();

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
                var location = await dbContext.InventoryItems
                    .Where(i => i.Id == reservation.InventoryItemId)
                    .Select(i => new InventoryModule.Application.Stock.StockLocation(
                        i.ProductId, i.VariantId, i.WarehouseId))
                    .FirstOrDefaultAsync(cancellationToken);

                if (location.ProductId != Guid.Empty)
                {
                    await ledger.ReleaseAsync(location, reservation.Quantity,
                        new InventoryModule.Application.Stock.StockLedgerContext(
                            "system:expired-reservation-cleanup",
                            reservation.ReferenceId, reservation.ReferenceType,
                            Notes: $"Giữ chỗ hết hạn lúc {reservation.ExpiresAt:o}"),
                        cancellationToken);

                    _logger.LogInformation(
                        "Released {Quantity} units of product {ProductId} from expired reservation {ReservationId}",
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
