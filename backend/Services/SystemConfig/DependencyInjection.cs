using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SystemConfig.Infrastructure;

namespace SystemConfig;

public static class DependencyInjection
{
    public static IServiceCollection AddSystemConfigModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<SystemConfigDbContext>(options =>
            options.UseNpgsql(connectionString));

        return services;
    }
}
