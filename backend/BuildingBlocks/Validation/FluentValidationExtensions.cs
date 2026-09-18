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
    /// <summary>Assembly gốc của solution - mọi project trong repo đều tham chiếu tới nó.</summary>
    private static readonly string CoreAssemblyName =
        typeof(FluentValidationExtensions).Assembly.GetName().Name!;

    /// <summary>
    /// Đăng ký tất cả IValidator&lt;T&gt; (FluentValidation) tìm thấy trong các assembly của solution.
    ///
    /// Nhận diện assembly "của mình" bằng CÁCH THAM CHIẾU chứ không bằng danh sách tên viết tay:
    /// một project thuộc solution thì tham chiếu <c>BuildingBlocks</c>, còn gói NuGet thì không.
    /// Danh sách tên cũ chứa <c>"InventoryModule"</c> - đó là NAMESPACE, còn assembly tên là
    /// <c>Inventory</c> (theo tên .csproj), nên toàn bộ validator của Inventory chưa bao giờ được
    /// đăng ký: <c>CreateGRNDto</c>, <c>CreateTransferDto</c>, <c>AdjustStockDto</c> khai báo
    /// <c>WithValidation&lt;T&gt;()</c> nhưng endpoint nhận mọi dữ liệu. Lỗi này chỉ lộ ra khi
    /// <see cref="ValidatorRegistrationGuard"/> chặn lúc khởi động (W1-3).
    /// </summary>
    public static IServiceCollection AddApplicationValidators(this IServiceCollection services)
    {
        var assemblies = AppDomain.CurrentDomain.GetAssemblies()
            .Where(a => !a.IsDynamic && IsSolutionAssembly(a))
            .Distinct()
            .ToArray();

        foreach (var assembly in assemblies)
        {
            services.AddValidatorsFromAssembly(assembly, ServiceLifetime.Scoped);
        }

        // Fail fast: an endpoint that declared WithValidation<T>() without a validator accepts ANY
        // body silently. The guard runs once at startup, after all endpoints are mapped.
        services.AddHostedService<ValidatorRegistrationGuard>();

        return services;
    }

    /// <summary>
    /// True khi assembly thuộc solution: chính <c>BuildingBlocks</c>, hoặc bất kỳ assembly nào tham
    /// chiếu tới nó. <c>GetReferencedAssemblies()</c> đọc metadata đã nạp sẵn - không nạp thêm gì.
    /// </summary>
    private static bool IsSolutionAssembly(System.Reflection.Assembly assembly)
    {
        var name = assembly.GetName().Name;
        if (name is null) return false;
        if (string.Equals(name, CoreAssemblyName, StringComparison.Ordinal)) return true;

        try
        {
            return assembly.GetReferencedAssemblies()
                .Any(r => string.Equals(r.Name, CoreAssemblyName, StringComparison.Ordinal));
        }
        catch
        {
            // Một assembly không nạp được metadata tham chiếu (ví dụ assembly sinh động) thì bỏ qua,
            // chứ không được làm hỏng cả quá trình khởi động.
            return false;
        }
    }

    /// <summary>
    /// Gắn <see cref="ValidationEndpointFilter{TRequest}"/> vào endpoint để validate body request
    /// kiểu <typeparamref name="TRequest"/> trước khi vào handler.
    ///
    /// Đồng thời ghi <typeparamref name="TRequest"/> vào <see cref="ValidationContractRegistry"/>:
    /// nếu thiếu <c>IValidator&lt;TRequest&gt;</c>, <see cref="ValidatorRegistrationGuard"/> sẽ NÉM
    /// LỖI LÚC KHỞI ĐỘNG thay vì để endpoint âm thầm nhận mọi dữ liệu.
    /// </summary>
    public static RouteHandlerBuilder WithValidation<TRequest>(this RouteHandlerBuilder builder)
    {
        ValidationContractRegistry.Register(typeof(TRequest));
        return builder.AddEndpointFilter<ValidationEndpointFilter<TRequest>>()
            .ProducesValidationProblem();
    }
}
