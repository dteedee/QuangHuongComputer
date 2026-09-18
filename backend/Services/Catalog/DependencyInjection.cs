using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;
using Catalog.Application.Media;
using Microsoft.Extensions.Configuration;
using BuildingBlocks.Database;
using BuildingBlocks.Storage;

namespace Catalog;

public static class DependencyInjection
{
    public static IServiceCollection AddCatalogModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        services.AddDbContext<CatalogDbContext>((serviceProvider, options) =>
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

        // W1-6 / D02: MinIO gỡ hoàn toàn — local disk qua IFileStorage (BuildingBlocks/Storage).
        // Đăng ký ở đây (không phải ServiceRegistration.cs, không thuộc sở hữu track này) vì cả
        // Catalog lẫn Content đều được nạp vào CHUNG một IServiceCollection ở composition root
        // (Program.cs) — module nào gọi AddFileStorage() trước cũng đủ cho cả hai.
        services.AddFileStorage(configuration);
        services.AddScoped<MediaUploadService>();
        services.AddSingleton<MediaValidator>();

        return services;
    }
}
