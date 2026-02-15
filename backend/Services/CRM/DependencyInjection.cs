using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using CRM.Infrastructure;
using CRM.Services;
using Microsoft.Extensions.Configuration;

namespace CRM;

public static class DependencyInjection
{
    public static IServiceCollection AddCrmModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContextPool<CrmDbContext>(options =>
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.CommandTimeout(30);
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(5),
                    errorCodesToAdd: null);
            }),
            poolSize: 128);

        // Register CRM services
        services.AddScoped<IRfmCalculationService, RfmCalculationService>();
        services.AddScoped<ISegmentationService, SegmentationService>();
        services.AddScoped<ILeadManagementService, LeadManagementService>();
        services.AddScoped<IEmailCampaignService, EmailCampaignService>();

        // Register background services
        services.AddHostedService<RfmCalculationBackgroundService>();

        return services;
    }
}
