using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Content.Infrastructure;
using BuildingBlocks.Database;
using BuildingBlocks.Seo;
using Content.Application.Redirects;

namespace Content;

public static class DependencyInjection
{
    public static IServiceCollection AddContentModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContext<ContentDbContext>((serviceProvider, options) =>
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

        // Bảng chuyển hướng URL (SEO shell): bảng active giữ trong IMemoryCache, đếm lượt truy cập
        // qua hàng đợi trong bộ nhớ + dịch vụ nền ghi theo lô, tự tạo 301 khi Catalog đổi slug.
        services.AddMemoryCache();
        services.AddSingleton<UrlRedirectHitQueue>();
        services.AddSingleton<UrlRedirectTable>();
        services.AddSingleton<IUrlRedirectResolver>(sp => sp.GetRequiredService<UrlRedirectTable>());
        services.AddSingleton<ISlugRedirectRecorder, SlugRedirectRecorder>();
        services.AddHostedService<UrlRedirectHitFlushService>();
        services.AddScoped<UrlRedirectService>();
        services.AddScoped<UrlRedirectImportService>();

        return services;
    }
}
