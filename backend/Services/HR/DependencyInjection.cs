using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using HR.Infrastructure;
using HR.Application.Attendance;
using HR.Application.Payroll;
using BuildingBlocks.Database;

namespace HR;

public static class DependencyInjection
{
    public static IServiceCollection AddHRModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContext<HRDbContext>((serviceProvider, options) =>
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
        });

        // Phase 06 — Application services
        services.AddSingleton<IStoreLocationProvider, InMemoryStoreLocationProvider>();
        services.AddScoped<AttendanceValidator>();
        services.AddScoped<AttendanceCheckInService>();
        services.AddScoped<AttendanceAggregationService>();
        services.AddScoped<PayrollCalculationService>();
        services.AddScoped<PayrollRunService>();
        services.AddScoped<PayslipGenerator>();
        services.AddScoped<BankTransferFileGenerator>();

        return services;
    }
}
