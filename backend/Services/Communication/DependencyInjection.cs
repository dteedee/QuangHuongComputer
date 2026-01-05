
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Communication;

public static class DependencyInjection
{
    public static IServiceCollection AddCommunicationModule(this IServiceCollection services, IConfiguration configuration)
    {
        // Email
        services.AddTransient<IEmailService, EmailService>();

        return services;
    }
}
