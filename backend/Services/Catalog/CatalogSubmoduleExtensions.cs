using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Catalog;

/// <summary>Quét assembly Catalog tìm <see cref="ICatalogSubmodule"/> và gọi Register/Map. Xem đó.</summary>
public static class CatalogSubmoduleExtensions
{
    private static IReadOnlyList<ICatalogSubmodule> Discover()
        => typeof(CatalogSubmoduleExtensions).Assembly.GetTypes()
            .Where(t => typeof(ICatalogSubmodule).IsAssignableFrom(t) && t is { IsAbstract: false, IsInterface: false })
            .Select(t => (ICatalogSubmodule)Activator.CreateInstance(t)!)
            .ToList();

    public static IServiceCollection AddCatalogSubmodules(this IServiceCollection services)
    {
        foreach (var submodule in Discover())
            submodule.Register(services);
        return services;
    }

    public static void MapCatalogSubmodules(this IEndpointRouteBuilder app)
    {
        foreach (var submodule in Discover())
            submodule.Map(app);
    }
}
