using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace BuildingBlocks.Time;

/// <summary>
/// Đăng ký <see cref="IBusinessClock"/>. Host gọi một lần
/// (<c>services.AddBusinessClock()</c>, hoặc gián tiếp qua <c>AddPlatformKernel()</c>).
///
/// <c>TryAdd</c>: module nào đăng ký đồng hồ riêng trước thì thắng, gọi nhiều lần vô hại.
/// Singleton vì <see cref="SystemBusinessClock"/> không giữ trạng thái.
/// </summary>
public static class BusinessClockServiceCollectionExtensions
{
    public static IServiceCollection AddBusinessClock(this IServiceCollection services)
    {
        services.TryAddSingleton<IBusinessClock, SystemBusinessClock>();
        return services;
    }
}
