using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Omnichannel.Infrastructure;
using Microsoft.Extensions.Configuration;
using BuildingBlocks.Database;

namespace Omnichannel;

public static class DependencyInjection
{
    public static IServiceCollection AddOmnichannelModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContextPool<OmnichannelDbContext>((serviceProvider, options) =>
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

        return services;
    }
}
