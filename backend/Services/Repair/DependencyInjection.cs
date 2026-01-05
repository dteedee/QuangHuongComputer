using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Repair.Infrastructure;

namespace Repair;

public static class DependencyInjection
{
    public static IServiceCollection AddRepairModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<RepairDbContext>(options =>
            options.UseNpgsql(connectionString));

        return services;
    }
}
