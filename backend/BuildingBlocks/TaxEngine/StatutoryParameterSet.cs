namespace BuildingBlocks.TaxEngine;

/// <summary>
/// W1-15 / D06 §3 — bộ tham số pháp luật ĐÃ RESOLVE tại một ngày <see cref="AsOf"/>.
/// Bất biến, không I/O. <c>Payroll.StatutorySnapshotJson</c> lưu lại chính bộ này để
/// một bảng lương đã trả tái lập được khi thanh tra/quyết toán.
///
/// Ngày tra (D06 §3): BẢO HIỂM + lương tối thiểu vùng + hệ số OT theo NGÀY 01 CỦA THÁNG LƯƠNG;
/// THUẾ TNCN theo <c>PayrollRun.PayDate</c>. Hai ngày này có thể rơi vào hai bộ tham số khác nhau
/// (TV2a kỳ 9/2026 vs TV2b kỳ 6/2026 lệch 361.000đ tiền bảo hiểm trên cùng mức lương).
/// </summary>
public sealed record StatutoryParameterSet
{
    public required DateOnly AsOf { get; init; }

    // --- Thuế TNCN ---
    public required decimal PitPersonalDeduction { get; init; }
    public required decimal PitDependentDeduction { get; init; }
    public required IReadOnlyList<PitBracket> PitBrackets { get; init; }
    public required decimal PitNonResidentRate { get; init; }
    public required decimal PitFlatRate { get; init; }
    public required decimal PitFlatThreshold { get; init; }
    public required OvertimeExemptMode PitOvertimeExemptMode { get; init; }
    public required decimal PitMealTaxFreeCap { get; init; }

    // --- Bảo hiểm ---
    public required decimal SiReferenceLevel { get; init; }
    public required decimal SiCapMultiplier { get; init; }
    public required decimal UiCapMultiplier { get; init; }
    public required InsuranceRates Rates { get; init; }
    public required decimal SiUnpaidDaysSkip { get; init; }
    public required bool HiSkipOnUnpaidDays { get; init; }
    public required bool UiSkipOnUnpaidDays { get; init; }

    // --- Lao động ---
    public required IReadOnlyDictionary<WageRegion, RegionalMinWage> RegionalMinWages { get; init; }
    public required WageRegion CompanyWageRegion { get; init; }
    public required OvertimeMultipliers OvertimeMultipliers { get; init; }
    public required OvertimeLimits OvertimeLimits { get; init; }
    public required decimal ProbationMinRatio { get; init; }

    /// <summary>Dòng nguồn của từng Code — để hiện căn cứ pháp lý và link nguồn trên màn hình quản trị.</summary>
    public required IReadOnlyDictionary<string, StatutoryParameterRow> SourceRows { get; init; }

    /// <summary>Trần đóng BHXH + BHYT = <see cref="SiCapMultiplier"/> × mức tham chiếu (Luật BHXH 41/2024 Đ.31.1đ).</summary>
    public decimal SocialInsuranceCap => SiReferenceLevel * SiCapMultiplier;

    /// <summary>Trần đóng BHTN = <see cref="UiCapMultiplier"/> × lương tối thiểu tháng của vùng (Luật 74/2025 Đ.34.2).</summary>
    public decimal UnemploymentCapFor(WageRegion region) => MinWageFor(region).MonthlyWage * UiCapMultiplier;

    public RegionalMinWage MinWageFor(WageRegion region)
        => RegionalMinWages.TryGetValue(region, out var w)
            ? w
            : throw new InvalidOperationException($"REGIONAL_MIN_WAGE thiếu vùng {region} tại {AsOf:yyyy-MM-dd}.");

    /// <summary>Căn cứ pháp lý của một Code (rỗng nếu không có dòng nguồn).</summary>
    public string LegalBasisOf(string code)
        => SourceRows.TryGetValue(code, out var row) ? row.LegalBasis : string.Empty;
}

/// <summary>
/// Một bậc của biểu thuế luỹ tiến từng phần (thu nhập tính thuế THÁNG).
/// </summary>
/// <param name="UpTo">Trần của bậc; <c>null</c> = bậc cuối, không trần.</param>
/// <param name="Rate">Thuế suất của bậc.</param>
/// <param name="QuickDeduction">Số trừ nhanh (chỉ để hiển thị/đối chiếu — engine tính bằng cách cộng dồn từng bậc).</param>
public readonly record struct PitBracket(decimal? UpTo, decimal Rate, decimal QuickDeduction);

/// <summary>Lương tối thiểu vùng. <c>HourlyWage = 0</c> nghĩa là mốc đó không có số giờ trong D06.</summary>
public readonly record struct RegionalMinWage(decimal MonthlyWage, decimal HourlyWage);

/// <summary>Vùng lương tối thiểu theo NĐ 293/2025. Công ty ở xã Vĩnh Bảo, TP Hải Phòng = vùng I.</summary>
public enum WageRegion
{
    I = 1,
    II = 2,
    III = 3,
    IV = 4
}

/// <summary>
/// Cách miễn thuế TNCN cho tiền làm thêm giờ / làm đêm.
/// </summary>
public enum OvertimeExemptMode
{
    /// <summary>Luật cũ (đến kỳ 2025): chỉ miễn PHẦN CHÊNH so với lương giờ ngày thường.</summary>
    PremiumOnly,

    /// <summary>Từ kỳ 2026: miễn TOÀN BỘ tiền OT/đêm trong phạm vi giờ hợp pháp (Luật 109/2025 Đ.4.8; NĐ 253/2026 Đ.26).</summary>
    FullWithinLegalHours
}

/// <summary>Loại ngày làm thêm — quyết định hệ số (BLLĐ Đ.98).</summary>
public enum OvertimeDayType
{
    Weekday,
    RestDay,
    Holiday
}

/// <summary>Tỉ lệ đóng bảo hiểm và công đoàn (phân số).</summary>
public readonly record struct InsuranceRates(
    decimal SiEmployee,
    decimal HiEmployee,
    decimal UiEmployee,
    decimal SiEmployerSickness,
    decimal SiEmployerPension,
    decimal SiEmployerAccident,
    decimal HiEmployer,
    decimal UiEmployer,
    decimal UnionFeeEmployer,
    decimal UnionDuesEmployee,
    decimal UnionDuesCapRatio)
{
    public decimal SiEmployerTotal => SiEmployerSickness + SiEmployerPension + SiEmployerAccident;
    public decimal EmployeeTotal => SiEmployee + HiEmployee + UiEmployee;
}

/// <summary>
/// Hệ số làm thêm giờ (BLLĐ Đ.98 + NĐ 145/2020 Đ.57).
/// OT đêm = hệ số ngày + <see cref="NightPremium"/> + <see cref="NightOvertimeExtra"/> × hệ số lương của ngày đó
/// (thường 1,0 · nghỉ tuần 2,0 · lễ 3,0) → tổng 200% / 270% / 390%.
/// </summary>
public readonly record struct OvertimeMultipliers(
    decimal Weekday,
    decimal RestDay,
    decimal Holiday,
    decimal NightPremium,
    decimal NightOvertimeExtra)
{
    public decimal For(OvertimeDayType dayType) => dayType switch
    {
        OvertimeDayType.RestDay => RestDay,
        OvertimeDayType.Holiday => Holiday,
        _ => Weekday
    };

    /// <summary>Hệ số lương của NGÀY đó dùng cho phụ trội đêm: ngày thường 1,0; nghỉ tuần/lễ = hệ số OT.</summary>
    public decimal DayWageFactor(OvertimeDayType dayType) => dayType switch
    {
        OvertimeDayType.RestDay => RestDay,
        OvertimeDayType.Holiday => Holiday,
        _ => 1.0m
    };

    /// <summary>Hệ số áp dụng cho 1 giờ OT, có tính làm đêm hay không.</summary>
    public decimal Coefficient(OvertimeDayType dayType, bool atNight)
        => atNight
            ? For(dayType) + NightPremium + NightOvertimeExtra * DayWageFactor(dayType)
            : For(dayType);
}

/// <summary>Trần giờ làm thêm (BLLĐ Đ.107) — cũng là trần giờ OT được miễn thuế (D06 §4).</summary>
public readonly record struct OvertimeLimits(decimal MonthHours, decimal YearHours);
