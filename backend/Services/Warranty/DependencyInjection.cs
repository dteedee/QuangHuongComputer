using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Warranty.Infrastructure;

namespace Warranty;

public static class DependencyInjection
{
    public static IServiceCollection AddWarrantyModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<WarrantyDbContext>(options =>
            options.UseNpgsql(connectionString));

        return services;
    }
}
