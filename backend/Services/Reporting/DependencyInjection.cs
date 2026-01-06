using Microsoft.Extensions.DependencyInjection;

namespace Reporting;

public static class DependencyInjection
{
    public static IServiceCollection AddReportingModule(this IServiceCollection services)
    {
        return services;
    }
}
