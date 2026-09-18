using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Warranty.Infrastructure;
using BuildingBlocks.Database;

namespace Warranty;

public static class DependencyInjection
{
    public static IServiceCollection AddWarrantyModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContext<WarrantyDbContext>((serviceProvider, options) =>
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

        // Phase 07: receipt generator + SLA background monitor.
        services.AddScoped<Warranty.Application.WarrantyReceiptGenerator>();
        services.AddHostedService<Warranty.Application.WarrantySlaMonitor>();
        // W2-6 / D08: resolve số tháng BH theo Product -> danh mục lá -> cha -> DEFAULT.
        services.AddScoped<Warranty.Application.WarrantyPolicyResolver>();

        return services;
    }
}
