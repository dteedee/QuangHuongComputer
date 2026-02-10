using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Repair.Infrastructure;
using Repair.Services;

namespace Repair;

public static class DependencyInjection
{
    public static IServiceCollection AddRepairModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContextPool<RepairDbContext>(options =>
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.CommandTimeout(30);
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null);
            }),
            poolSize: 128);

        // Register services
        services.AddHttpClient("InventoryService", client =>
        {
            client.BaseAddress = new Uri(configuration["Services:Inventory:Url"] ?? "http://localhost:5001");
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        services.AddScoped<IInventoryService, InventoryService>();

        return services;
    }
}
