using Microsoft.Extensions.DependencyInjection;
using Sales.Application.Pricing.Rules;

namespace Sales.Application.Pricing;

/// <summary>
/// Đăng ký PricingEngine + 9 rule + PromotionEvaluator vào DI container.
/// Gọi trong Sales.DependencyInjection hoặc trực tiếp trong Program.cs.
/// </summary>
public static class PricingModuleExtensions
{
    public static IServiceCollection AddPricingEngine(this IServiceCollection services)
    {
        // 9 rule cho 9 loại điều kiện (đăng ký như IEnumerable<IPromotionRule>).
        services.AddScoped<IPromotionRule, MinOrderValueRule>();
        services.AddScoped<IPromotionRule, CategoryRule>();
        services.AddScoped<IPromotionRule, BrandRule>();
        services.AddScoped<IPromotionRule, ProductRule>();
        services.AddScoped<IPromotionRule, CustomerGroupRule>();
        services.AddScoped<IPromotionRule, TimeOfDayRule>();
        services.AddScoped<IPromotionRule, DayOfWeekRule>();
        services.AddScoped<IPromotionRule, FirstOrderRule>();
        services.AddScoped<IPromotionRule, QuantityRule>();

        services.AddScoped<PromotionEvaluator>();
        // Concrete engine — Sales.DependencyInjection cũng đăng ký IPricingEngine → PricingEngine.
        services.AddScoped<PricingEngine>();

        return services;
    }
}
