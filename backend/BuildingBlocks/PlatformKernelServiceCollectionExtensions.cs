using BuildingBlocks.Configuration;
using BuildingBlocks.Documents;
using BuildingBlocks.Validation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace BuildingBlocks;

/// <summary>
/// One call that registers the whole W1-3 platform kernel. The host replaces its
/// <c>AddApplicationValidators()</c> call with this - the kernel pieces belong together and nothing
/// should have to remember four separate registrations.
///
/// What it wires:
///   * FluentValidation validators + the startup guard that refuses to boot when an endpoint
///     declared <c>WithValidation&lt;T&gt;()</c> without one;
///   * <see cref="IAppSettings"/> over the admin-editable settings table (falls back to
///     compile-time defaults until a module registers an <see cref="IAppSettingsStore"/>);
///   * <see cref="IDocumentNumberService"/>, backed by the <c>docnum_*_seq</c> PostgreSQL sequences.
///
/// Everything uses <c>TryAdd</c>, so a module that registered its own implementation first wins and
/// calling this twice is harmless.
/// </summary>
public static class PlatformKernelServiceCollectionExtensions
{
    public static IServiceCollection AddPlatformKernel(this IServiceCollection services)
    {
        services.AddApplicationValidators();
        services.AddAppSettings();

        // Singleton: it holds only a connection string and opens its own short-lived connection per
        // call, so there is no scoped state to capture.
        services.TryAddSingleton<IDocumentNumberService, DocumentNumberService>();

        return services;
    }
}
