using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure;
using Catalog.Application.Media;
using Microsoft.Extensions.Configuration;
using BuildingBlocks.Database;
using Minio;

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

        // ----- Phase 03: MinIO client + Media services -----
        var minioSection = configuration.GetSection("MinIO");
        var mediaOptions = new MediaStorageOptions
        {
            Endpoint = minioSection["Endpoint"] ?? "localhost:9000",
            AccessKey = minioSection["AccessKey"] ?? string.Empty,
            SecretKey = minioSection["SecretKey"] ?? string.Empty,
            Bucket = minioSection["Bucket"] ?? "quanghuong-media",
            UseSSL = bool.TryParse(minioSection["UseSSL"], out var ssl) && ssl,
            PublicBaseUrl = minioSection["PublicBaseUrl"] ?? "http://localhost:9000",
        };
        services.AddSingleton(mediaOptions);
        services.AddSingleton<IMinioClient>(_ =>
        {
            var builder = new MinioClient()
                .WithEndpoint(mediaOptions.Endpoint)
                .WithCredentials(mediaOptions.AccessKey, mediaOptions.SecretKey);
            if (mediaOptions.UseSSL) builder = builder.WithSSL();
            return builder.Build();
        });
        services.AddScoped<MediaUploadService>();
        services.AddSingleton<MediaValidator>();

        return services;
    }
}
