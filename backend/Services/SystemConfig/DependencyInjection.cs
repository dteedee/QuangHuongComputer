using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using SystemConfig.Infrastructure;
using BuildingBlocks.Configuration;
using BuildingBlocks.Database;

namespace SystemConfig;

public static class DependencyInjection
{
    public static IServiceCollection AddSystemConfigModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not found");

        // EnableDynamicJson: cần cho map List<string>/POCO → jsonb (BackofficeMenuItem.AllowedRoles...)
        // Npgsql 8 tắt dynamic JSON mặc định — thiếu sẽ fail khi seed/ghi các cột jsonb kiểu động.
        var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
        dataSourceBuilder.EnableDynamicJson();
        var dataSource = dataSourceBuilder.Build();

        services.AddDbContext<SystemConfigDbContext>((serviceProvider, options) =>
        {
            options.UseNpgsql(dataSource, npgsqlOptions =>
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

        services.AddDbContext<CustomFieldDbContext>((serviceProvider, options) =>
        {
            options.UseNpgsql(dataSource, npgsqlOptions =>
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

        // Bảng cấu hình admin là nguồn của IAppSettings. Thiếu dòng này, mọi setting đọc qua
        // IAppSettings (phí ship, % hoa hồng, sức chứa khung giờ...) luôn là hằng số trong code.
        services.AddScoped<IAppSettingsStore, SystemConfigAppSettingsStore>();

        return services;
    }
}
