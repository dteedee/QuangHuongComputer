using BuildingBlocks.TaxEngine;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SystemConfig.Infrastructure;

namespace SystemConfig;

/// <summary>
/// Đọc hằng số thuế/bảo hiểm từ ConfigurationEntry (category "Tax") — implementation của
/// <see cref="ITaxSettingsProvider"/> khai báo ở BuildingBlocks/TaxEngine.
/// Fallback về hằng số luật định trong <see cref="VietnameseTaxEngine"/> nếu key thiếu hoặc parse lỗi.
/// </summary>
public class SystemConfigTaxSettingsProvider : ITaxSettingsProvider
{
    private readonly SystemConfigDbContext _db;

    public SystemConfigTaxSettingsProvider(SystemConfigDbContext db) => _db = db;

    public async Task<TaxSettings> GetAsync(CancellationToken ct = default)
    {
        var entries = await _db.Configurations
            .AsNoTracking()
            .Where(c => c.Category == "Tax")
            .ToDictionaryAsync(c => c.Key, c => c.Value, ct);

        return new TaxSettings(
            PersonalDeduction: ParseDecimal(entries, "TAX_PERSONAL_DEDUCTION", VietnameseTaxEngine.PersonalDeduction),
            DependentDeduction: ParseDecimal(entries, "TAX_DEPENDENT_DEDUCTION", VietnameseTaxEngine.DependentDeduction),
            BaseSalary: ParseDecimal(entries, "TAX_BASE_SALARY", VietnameseTaxEngine.BaseSalary2025),
            VatDefaultRatePercent: ParseDecimal(entries, "TAX_VAT_DEFAULT_RATE", VietnameseTaxEngine.VatStandard * 100));
    }

    private static decimal ParseDecimal(Dictionary<string, string> entries, string key, decimal fallback)
        => entries.TryGetValue(key, out var raw) && decimal.TryParse(raw, out var value) ? value : fallback;
}

/// <summary>
/// Extension method để đăng ký <see cref="ITaxSettingsProvider"/> vào DI container.
/// LƯU Ý (Phase 01): việc gọi <c>AddTaxSettings()</c> trong ApiGateway/Program.cs thuộc phạm vi
/// phase khác (Program.cs không được sửa ở phase này) — orchestrator/phase 05 sẽ thêm dòng gọi.
/// </summary>
public static class TaxSettingsDependencyInjection
{
    public static IServiceCollection AddTaxSettings(this IServiceCollection services)
    {
        services.AddScoped<ITaxSettingsProvider, SystemConfigTaxSettingsProvider>();
        return services;
    }
}
