using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace BuildingBlocks.Storage;

/// <summary>
/// Đăng ký <see cref="IFileStorage"/> + <see cref="IMediaUrlResolver"/> — MỘT lần cho toàn bộ
/// composition root (modular monolith dùng chung một <c>IServiceCollection</c>, nên module nào
/// gọi trước cũng được; Catalog gọi vì Catalog sở hữu <c>DependencyInjection.cs</c> của module đó —
/// xem <c>Catalog/DependencyInjection.cs</c>). Dùng <c>TryAdd*</c> để an toàn nếu bị gọi lại.
/// </summary>
public static class FileStorageServiceCollectionExtensions
{
    public static IServiceCollection AddFileStorage(this IServiceCollection services, IConfiguration configuration)
    {
        services.TryAddSingleton(sp =>
        {
            var env = sp.GetRequiredService<IHostEnvironment>();
            return FileStorageOptions.Resolve(configuration, env.ContentRootPath);
        });
        services.TryAddSingleton<IFileStorage, LocalDiskFileStorage>();
        services.TryAddSingleton<IMediaUrlResolver, MediaUrlResolver>();
        return services;
    }
}
