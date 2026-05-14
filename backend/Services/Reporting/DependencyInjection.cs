using Microsoft.Extensions.DependencyInjection;
using QuestPDF.Infrastructure;

namespace Reporting;

public static class DependencyInjection
{
    public static IServiceCollection AddReportingModule(this IServiceCollection services)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        return services;
    }
}
