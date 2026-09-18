using System.Collections.Concurrent;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.Validation;

/// <summary>
/// Every DTO type an endpoint declared <c>WithValidation&lt;T&gt;()</c> for.
///
/// <see cref="FluentValidationExtensions.WithValidation{TRequest}"/> is a promise: "this endpoint
/// validates its body". If no <c>IValidator&lt;T&gt;</c> is registered, the filter silently lets
/// EVERYTHING through and the promise is a lie that nothing detects - the endpoint just stops
/// validating. That is how this codebase ended up with validation on ~4% of write endpoints while
/// looking validated at the call site.
/// </summary>
public static class ValidationContractRegistry
{
    private static readonly ConcurrentDictionary<Type, byte> Requested = new();

    /// <summary>Called by <see cref="FluentValidationExtensions.WithValidation{TRequest}"/>. Idempotent.</summary>
    public static void Register(Type requestType) => Requested.TryAdd(requestType, 0);

    /// <summary>Snapshot of the DTO types that declared validation. Ordered for a stable message.</summary>
    public static IReadOnlyList<Type> RequestedTypes
        => Requested.Keys.OrderBy(t => t.FullName, StringComparer.Ordinal).ToList();

    /// <summary>
    /// Types that promised validation but have no registered validator. Resolved from
    /// <paramref name="services"/> inside a scope, because validators are registered Scoped.
    /// </summary>
    public static IReadOnlyList<Type> FindMissingValidators(IServiceProvider services)
    {
        var missing = new List<Type>();
        using var scope = services.CreateScope();

        foreach (var requestType in RequestedTypes)
        {
            // MUST stay fully qualified: this file's own namespace (BuildingBlocks.Validation) also
            // declares an IValidator<T>, and a same-namespace type beats a `using` import - so the
            // unqualified name silently resolved to the wrong interface and every type looked
            // "missing". ValidationEndpointFilter resolves the FluentValidation one.
            var validatorType = typeof(global::FluentValidation.IValidator<>).MakeGenericType(requestType);
            if (scope.ServiceProvider.GetService(validatorType) is null)
            {
                missing.Add(requestType);
            }
        }

        return missing;
    }
}

/// <summary>
/// Fails the process at startup when an endpoint declared <c>WithValidation&lt;T&gt;()</c> without a
/// matching validator.
///
/// Why a hosted service and not a check inside <c>WithValidation</c>: at endpoint-mapping time the
/// <see cref="IServiceProvider"/> does not exist yet, and at <c>AddApplicationValidators()</c> time
/// no endpoint has been mapped. <c>IHostedService.StartAsync</c> is the first moment both are true -
/// it runs after every <c>app.MapXxx()</c> call and before the first request is served, so throwing
/// here aborts startup with a precise message instead of shipping an endpoint that quietly accepts
/// anything. Registered automatically by <see cref="FluentValidationExtensions.AddApplicationValidators"/>.
/// </summary>
public sealed class ValidatorRegistrationGuard : IHostedService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<ValidatorRegistrationGuard> _logger;

    public ValidatorRegistrationGuard(IServiceProvider services, ILogger<ValidatorRegistrationGuard> logger)
    {
        _services = services;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var declared = ValidationContractRegistry.RequestedTypes;
        var missing = ValidationContractRegistry.FindMissingValidators(_services);

        if (missing.Count > 0)
        {
            var names = string.Join(", ", missing.Select(t => t.Name));
            throw new InvalidOperationException(
                $"WithValidation<T>() was declared for {missing.Count} type(s) with no registered " +
                $"IValidator<T>: {names}. The endpoint would accept ANY body. Add an " +
                "AbstractValidator<T> in the owning module (AddApplicationValidators scans the module " +
                "assemblies automatically), or remove the WithValidation<T>() call.");
        }

        _logger.LogInformation("Validation contract OK: {Count} request type(s) have a validator.", declared.Count);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
