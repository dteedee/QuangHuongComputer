namespace BuildingBlocks.TaxEngine;

/// <summary>
/// Giá trị cấu hình thuế/bảo hiểm động — đọc từ SystemConfig (category "Tax") tại runtime.
/// Cho phép thay đổi hằng số pháp luật (giảm trừ gia cảnh, lương cơ sở...) mà không cần deploy lại.
/// </summary>
public record TaxSettings(
    decimal PersonalDeduction,
    decimal DependentDeduction,
    decimal BaseSalary,
    decimal VatDefaultRatePercent);

/// <summary>
/// Abstraction để <see cref="VietnameseTaxEngine"/> callers lấy hằng số thuế động từ SystemConfig,
/// thay vì hardcode. Implementation cụ thể (đọc DB) nằm ở Services/SystemConfig để tránh
/// BuildingBlocks phụ thuộc ngược vào một service cụ thể — đăng ký DI qua
/// <c>SystemConfig.TaxSettingsDependencyInjection.AddTaxSettings()</c>.
/// </summary>
public interface ITaxSettingsProvider
{
    /// <summary>Trả về giá trị hiện hành; fallback về hằng số luật định nếu config thiếu/không hợp lệ.</summary>
    Task<TaxSettings> GetAsync(CancellationToken ct = default);
}
