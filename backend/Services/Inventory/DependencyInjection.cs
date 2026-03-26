using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using InventoryModule.Infrastructure;
using InventoryModule.Application.BackgroundServices;
using Microsoft.Extensions.Configuration;
using BuildingBlocks.Database;

namespace InventoryModule;

public static class DependencyInjection
{
    public static IServiceCollection AddInventoryModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContextPool<InventoryDbContext>((serviceProvider, options) =>
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
        },
            poolSize: 128);

        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));

        // Register background service để tự động release expired reservations
        services.AddHostedService<ExpiredReservationCleanupService>();

        return services;
    }
}
