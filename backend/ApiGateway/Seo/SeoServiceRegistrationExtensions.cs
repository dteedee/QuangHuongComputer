using System.Reflection;
using BuildingBlocks.Seo;
using Catalog.Seo;
using Microsoft.AspNetCore.OutputCaching;

namespace ApiGateway.Seo;

/// <summary>
/// `AddSeoShell()` — the integration point W1-5 already left a call site for in
/// `ServiceRegistration.RegisterInfrastructure` (see the comment above `AddOutputCache()` there;
/// wiring the actual call is filed in `reports/integration-requests-w2.md` since
/// `ServiceRegistration.cs` is not owned by this track).
///
/// Provider discovery follows the SAME convention `AddApplicationValidators()` already uses
/// (`FluentValidationExtensions.cs`) rather than requiring each module to remember to register
/// itself in its own `Add&lt;Module&gt;Module()` — those files (`Catalog/DependencyInjection.cs`,
/// `Content/DependencyInjection.cs`) are owned by other tracks, so a manual-registration convention
/// here would need an integration request per module per provider added, forever. An `AppDomain`
/// scan for `ISeoPageProvider` has none of that cost and a new provider "just works" the moment its
/// file exists, same as `IValidator&lt;T&gt;` does today.
/// </summary>
public static class SeoServiceRegistrationExtensions
{
    public static IServiceCollection AddSeoShell(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<SeoShellOptions>(configuration.GetSection(SeoShellOptions.SectionName));

        // Named client (not a typed `AddHttpClient<SeoShellTemplateLoader>`) — see the loader's own
        // doc comment for why: it must stay a Singleton for its in-memory cache to work.
        services.AddHttpClient(SeoShellTemplateLoader.HttpClientName, client =>
        {
            client.Timeout = TimeSpan.FromSeconds(5); // internal network hop
        });
        services.AddSingleton<SeoShellTemplateLoader>();

        // `CatalogJsonLdBuilder` doesn't implement `ISeoPageProvider` (it's a shared helper several
        // Catalog providers take by constructor injection), so it needs its own registration — the
        // AppDomain scan below only looks for `ISeoPageProvider` implementations.
        services.AddScoped<CatalogJsonLdBuilder>();

        foreach (var providerType in DiscoverProviderTypes())
        {
            services.AddScoped(typeof(ISeoPageProvider), providerType);
        }

        services.AddOutputCache(options =>
        {
            options.AddPolicy(SeoOutputCachePolicy.PolicyName, new SeoOutputCachePolicy());
        });

        return services;
    }

    /// <summary>Every non-abstract <see cref="ISeoPageProvider"/> in an assembly that references BuildingBlocks — i.e. every module in this solution, the same test `IsSolutionAssembly` in `FluentValidationExtensions.cs` uses.</summary>
    private static IEnumerable<Type> DiscoverProviderTypes()
    {
        // FORCE the module assemblies that own a provider to be loaded before scanning
        // AppDomain.CurrentDomain.GetAssemblies(). `AddApplicationValidators()` hit exactly this bug
        // (ServiceRegistration.cs's own comment: it must run AFTER RegisterModules(), "để đảm bảo
        // mọi assembly Services.* đã được load vào AppDomain") — a scan run too early silently finds
        // zero providers instead of failing loudly. Referencing a type here forces the CLR to load
        // that assembly regardless of where in the startup sequence AddSeoShell() ends up being
        // called from (ApiGateway.csproj already references both at compile time, so this adds no
        // new dependency).
        _ = typeof(Catalog.Seo.CatalogHomeSeoProvider);
        _ = typeof(Content.Seo.ContentPostSeoProvider);

        var buildingBlocksName = typeof(ISeoPageProvider).Assembly.GetName().Name;

        bool IsSolutionAssembly(Assembly assembly)
        {
            var name = assembly.GetName().Name;
            if (name is null) return false;
            if (string.Equals(name, buildingBlocksName, StringComparison.Ordinal)) return true;
            return assembly.GetReferencedAssemblies().Any(r => string.Equals(r.Name, buildingBlocksName, StringComparison.Ordinal));
        }

        return AppDomain.CurrentDomain.GetAssemblies()
            .Where(a => !a.IsDynamic && IsSolutionAssembly(a))
            .Distinct()
            .SelectMany(a =>
            {
                try { return a.GetTypes(); }
                catch (ReflectionTypeLoadException ex) { return ex.Types.Where(t => t is not null)!; }
            })
            .Where(t => t is { IsClass: true, IsAbstract: false } && typeof(ISeoPageProvider).IsAssignableFrom(t))
            .Distinct();
    }
}
