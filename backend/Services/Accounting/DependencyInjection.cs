using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Accounting.Infrastructure;
using Microsoft.Extensions.Configuration;

namespace Accounting;

public static class DependencyInjection
{
    public static IServiceCollection AddAccountingModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContextPool<AccountingDbContext>(options =>
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.CommandTimeout(30);
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null);
            }),
            poolSize: 128);

        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));

        return services;
    }
}
