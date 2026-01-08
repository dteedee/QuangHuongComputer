
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Communication;

public static class DependencyInjection
{
    public static IServiceCollection AddCommunicationModule(this IServiceCollection services, IConfiguration configuration)
    {
        // Email is registered globally in BuildingBlocks.Email
        
        return services;
    }
}
