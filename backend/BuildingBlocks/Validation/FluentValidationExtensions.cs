using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace BuildingBlocks.Validation;

/// <summary>
/// Hạ tầng chuẩn hoá validation dùng FluentValidation cho toàn bộ minimal API endpoints.
/// </summary>
public static class FluentValidationExtensions
{
    /// <summary>
    /// Đăng ký tất cả IValidator&lt;T&gt; (FluentValidation) tìm thấy trong các assembly đã load
    /// thuộc solution (Services.* và BuildingBlocks).
    /// </summary>
    public static IServiceCollection AddApplicationValidators(this IServiceCollection services)
    {
        var assemblies = AppDomain.CurrentDomain.GetAssemblies()
            .Where(a => !a.IsDynamic
                && a.GetName().Name is { } name
                && (name.StartsWith("Accounting") || name.StartsWith("Catalog") || name.StartsWith("CRM")
                    || name.StartsWith("Communication") || name.StartsWith("Content") || name.StartsWith("HR")
                    || name.StartsWith("Identity") || name.StartsWith("InventoryModule") || name.StartsWith("Payments")
                    || name.StartsWith("Repair") || name.StartsWith("Reporting") || name.StartsWith("Sales")
                    || name.StartsWith("SystemConfig") || name.StartsWith("Warranty") || name.StartsWith("Ai")
                    || name.StartsWith("BuildingBlocks") || name.StartsWith("ApiGateway")))
            .Distinct()
            .ToArray();

        foreach (var assembly in assemblies)
        {
            services.AddValidatorsFromAssembly(assembly, ServiceLifetime.Scoped);
        }

        return services;
    }

    /// <summary>
    /// Gắn <see cref="ValidationEndpointFilter{TRequest}"/> vào endpoint để validate body request
    /// kiểu <typeparamref name="TRequest"/> trước khi vào handler. Yêu cầu đã đăng ký
    /// <see cref="AddApplicationValidators"/> và có <c>IValidator&lt;TRequest&gt;</c> tương ứng.
    /// </summary>
    public static RouteHandlerBuilder WithValidation<TRequest>(this RouteHandlerBuilder builder)
    {
        return builder.AddEndpointFilter<ValidationEndpointFilter<TRequest>>();
    }
}
