using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;
using Catalog.Application.Media;
using Catalog.Application.PriceHistory;
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

            // Đổi slug sản phẩm/danh mục -> tự tạo 301 trong bảng chuyển hướng (Content).
            var slugRedirects = serviceProvider.GetService<SlugChangeRedirectInterceptor>();
            if (slugRedirects != null)
                options.AddInterceptors(slugRedirects);
        });
        services.AddScoped<SlugChangeRedirectInterceptor>();

        // W1-6 / D02: MinIO gỡ hoàn toàn — local disk qua IFileStorage (BuildingBlocks/Storage).
        // Đăng ký ở đây (không phải ServiceRegistration.cs, không thuộc sở hữu track này) vì cả
        // Catalog lẫn Content đều được nạp vào CHUNG một IServiceCollection ở composition root
        // (Program.cs) — module nào gọi AddFileStorage() trước cũng đủ cho cả hai.
        services.AddFileStorage(configuration);
        services.AddScoped<MediaUploadService>();
        services.AddSingleton<MediaValidator>();

        // D10: hook lịch sử giá trên CatalogDbContext đọc context này (xem PriceChangeContext.cs).
        services.AddScoped<PriceChangeContext>();

        // "Thường được mua cùng": ICoPurchaseQuery do Sales đăng ký (contract ở BuildingBlocks).
        services.AddScoped<Catalog.Application.Products.BoughtTogetherService>();

        // W2-1 first commit: cho phép W2-9 (PC builder) và các phân hệ sau này tự đăng ký DI mà
        // không phải sửa file này - xem ICatalogSubmodule.cs.
        services.AddCatalogSubmodules();

        return services;
    }
}
