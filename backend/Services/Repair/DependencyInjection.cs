using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Repair.Infrastructure;
using Repair.Services;
using BuildingBlocks.Database;

namespace Repair;

public static class DependencyInjection
{
    public static IServiceCollection AddRepairModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContext<RepairDbContext>((serviceProvider, options) =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.CommandTimeout(30);
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null);
            });

            var interceptor = serviceProvider.GetService<AuditSaveChangesInterceptor>();
            if (interceptor != null)
                options.AddInterceptors(interceptor);
        });

        // W2-13: the old dead HTTP client (pointed at localhost:5001, never reachable)
        // is gone. Parts reserve/commit/release now call Inventory's IStockLedger
        // in-process (Repair -> Inventory project reference); Inventory's own
        // AddInventoryModule() registers IStockLedger and InventoryDbContext.
        services.AddScoped<IRepairStockService, RepairStockService>();

        return services;
    }
}
