using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Sales.Infrastructure;
using Sales.Application.Checkout;
using Sales.Application.Pricing;
using BuildingBlocks.Database;

namespace Sales;

public static class DependencyInjection
{
    public static IServiceCollection AddSalesModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContext<SalesDbContext>((serviceProvider, options) =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.CommandTimeout(30);
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null);
            });

            // Add audit interceptor
            var interceptor = serviceProvider.GetService<AuditSaveChangesInterceptor>();
            if (interceptor != null)
                options.AddInterceptors(interceptor);
        });

        // Phase 04: Checkout orchestrator + real PricingEngine (luồng A đã nộp).
        // Stub đã bị gỡ; đăng ký DI cho pricing bộ 9 rule + engine ở ApiGateway.ServiceRegistration.
        services.AddScoped<CheckoutOrchestrator>();
        services.TryAddScopedIfMissing<IPricingEngine, PricingEngine>();

        // Phase 07: Return workflow (3 luồng + nhập lại kho).
        services.AddScoped<Sales.Application.Returns.RestockService>();
        services.AddScoped<Sales.Application.Returns.ReturnOrchestrator>();

        return services;
    }

    private static void TryAddScopedIfMissing<TService, TImpl>(this IServiceCollection services)
        where TService : class
        where TImpl : class, TService
    {
        if (!services.Any(s => s.ServiceType == typeof(TService)))
        {
            services.AddScoped<TService, TImpl>();
        }
    }
}
