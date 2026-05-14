using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Accounting.Infrastructure;
using Accounting.Infrastructure.EInvoice;
using Microsoft.Extensions.Configuration;
using BuildingBlocks.Database;

namespace Accounting;

public static class DependencyInjection
{
    public static IServiceCollection AddAccountingModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContext<AccountingDbContext>((serviceProvider, options) =>
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

        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));

        // E-Invoice provider: use MISA if configured, otherwise Mock
        var einvoiceProvider = configuration["EInvoice:Provider"] ?? "Mock";
        if (einvoiceProvider == "MISA")
        {
            var misaConfig = new MISAConfig
            {
                AppId = configuration["EInvoice:MISA:AppId"] ?? "",
                SecretKey = configuration["EInvoice:MISA:SecretKey"] ?? "",
                TaxCode = configuration["EInvoice:MISA:TaxCode"] ?? "",
                Endpoint = configuration["EInvoice:MISA:Endpoint"] ?? "https://api-einvoice.misa.vn/api/v1"
            };
            services.AddSingleton(misaConfig);
            services.AddHttpClient<IEInvoiceProvider, MISAEInvoiceProvider>();
        }
        else
        {
            services.AddSingleton<IEInvoiceProvider, MockEInvoiceProvider>();
        }

        return services;
    }
}
