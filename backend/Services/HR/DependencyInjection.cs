using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using HR.Infrastructure;

namespace HR;

public static class DependencyInjection
{
    public static IServiceCollection AddHRModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<HRDbContext>(options =>
            options.UseNpgsql(connectionString));

        return services;
    }
}
