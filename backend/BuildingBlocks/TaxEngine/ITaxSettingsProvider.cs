using BuildingBlocks.SharedKernel;

namespace BuildingBlocks.TaxEngine;

/// <summary>
/// Giá trị cấu hình thuế động — đọc từ SystemConfig (category "Tax") tại runtime,
/// cho phép đổi hằng số pháp luật mà không deploy lại.
///
/// W1-15 / D01 §2 thêm 4 khoá cửa sổ giảm thuế GTGT. Các tham số mới là OPTIONAL và mặc định
/// về hằng số luật định trong <see cref="TaxRates"/>, nên provider cũ (4 tham số) vẫn biên dịch;
/// provider sẽ được nối dây đầy đủ ở W1-4 (xem integration request W1-15 #1).
///
/// Tham số LƯƠNG/BHXH KHÔNG nằm ở đây: D06 đặt chúng trong bảng hiệu lực theo ngày
/// <c>hr.StatutoryParameters</c>, đọc qua <see cref="IStatutoryParameterProvider"/>.
/// </summary>
/// <param name="PersonalDeduction">CŨ — giảm trừ bản thân. D06: dùng <see cref="IStatutoryParameterProvider"/>.</param>
/// <param name="DependentDeduction">CŨ — giảm trừ người phụ thuộc. D06: như trên.</param>
/// <param name="BaseSalary">CŨ — lương cơ sở. D06: <c>SI_REFERENCE_LEVEL</c>.</param>
/// <param name="VatDefaultRatePercent">TAX_VAT_DEFAULT_RATE — thuế suất LUẬT ĐỊNH, đơn vị PHẦN TRĂM (10).</param>
/// <param name="VatReductionPointsPercent">TAX_VAT_REDUCTION_POINTS — số điểm % được giảm (2).</param>
/// <param name="VatReductionFrom">TAX_VAT_REDUCTION_FROM — null nghĩa là thiếu/sai → fallback luật định.</param>
/// <param name="VatReductionTo">TAX_VAT_REDUCTION_TO — null nghĩa là thiếu/sai → fallback luật định.</param>
/// <param name="VatReductionLegalBasis">TAX_VAT_REDUCTION_LEGAL_BASIS — căn cứ in trên chứng từ.</param>
public record TaxSettings(
    decimal PersonalDeduction,
    decimal DependentDeduction,
    decimal BaseSalary,
    decimal VatDefaultRatePercent,
    decimal VatReductionPointsPercent = TaxRates.VatReductionPoints * 100m,
    DateOnly? VatReductionFrom = null,
    DateOnly? VatReductionTo = null,
    string VatReductionLegalBasis = TaxRates.VatReductionLegalBasis);

/// <summary>
/// Abstraction để caller lấy hằng số thuế động từ SystemConfig thay vì hardcode.
/// Implementation cụ thể (đọc DB) nằm ở Services/SystemConfig để BuildingBlocks không phụ thuộc
/// ngược vào một service cụ thể — đăng ký DI qua
/// <c>SystemConfig.TaxSettingsDependencyInjection.AddTaxSettings()</c>.
/// </summary>
public interface ITaxSettingsProvider
{
    /// <summary>Trả về giá trị hiện hành; fallback về hằng số luật định nếu config thiếu/không hợp lệ.</summary>
    Task<TaxSettings> GetAsync(CancellationToken ct = default);
}
