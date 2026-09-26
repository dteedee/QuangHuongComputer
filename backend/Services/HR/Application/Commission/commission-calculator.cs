using HR.Domain;

namespace HR.Application.Commission;

/// <summary>Mức hoa hồng áp dụng cho một phiếu: % trên căn cứ + tiền cố định mỗi phiếu.</summary>
public sealed record CommissionRate(decimal LaborPercent, decimal FixedAmountPerJob, bool IsDefault);

/// <summary>Kết quả tính cho một phiếu sửa (tiền nguyên VND).</summary>
public sealed record CommissionQuote(decimal BaseAmount, decimal RatePercent, decimal FixedAmount, decimal Amount, string Period);

/// <summary>
/// Phần THUẦN của hoa hồng kỹ thuật — không chạm DB, để unit test phủ hết quy tắc tiền.
/// </summary>
public static class CommissionCalculator
{
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    /// <summary>
    /// Dòng mức riêng có hiệu lực tại <paramref name="onDate"/> (EffectiveFrom lớn nhất ≤ ngày đó);
    /// không có -> <paramref name="fallback"/> (mặc định SystemConfig).
    /// </summary>
    public static CommissionRate ResolveRate(IEnumerable<CommissionPolicy> history, DateOnly onDate, CommissionRate fallback)
    {
        var policy = history
            .Where(p => p.EffectiveFrom <= onDate)
            .OrderByDescending(p => p.EffectiveFrom)
            .ThenByDescending(p => p.CreatedAt)
            .FirstOrDefault();
        return policy is null
            ? fallback
            : new CommissionRate(policy.LaborPercent, policy.FixedAmountPerJob, IsDefault: false);
    }

    /// <summary>Ngày làm việc (giờ Việt Nam) của một thời điểm UTC.</summary>
    public static DateOnly VietnamDate(DateTime utc) => DateOnly.FromDateTime(utc + VietnamOffset);

    /// <summary>
    /// Căn cứ = tiền công + phí dịch vụ (linh kiện đã bị loại ở phía Repair); số âm coi như 0.
    /// Tiền = làm tròn(căn cứ × % / 100) + cố định — làm tròn nửa lên, ra số nguyên VND.
    /// </summary>
    public static CommissionQuote Calculate(decimal laborAmount, decimal serviceFeeAmount, CommissionRate rate, DateTime paidAtUtc)
    {
        var baseAmount = RoundVnd(Math.Max(0m, laborAmount) + Math.Max(0m, serviceFeeAmount));
        var percentPart = RoundVnd(baseAmount * rate.LaborPercent / 100m);
        var amount = percentPart + RoundVnd(rate.FixedAmountPerJob);
        var period = CommissionPeriod.Of(VietnamDate(paidAtUtc));
        return new CommissionQuote(baseAmount, rate.LaborPercent, RoundVnd(rate.FixedAmountPerJob), amount, period);
    }

    public static decimal RoundVnd(decimal value) => Math.Round(value, 0, MidpointRounding.AwayFromZero);
}
