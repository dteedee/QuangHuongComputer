using BuildingBlocks.Configuration;

namespace HR.Application.Commission;

/// <summary>
/// Mức hoa hồng mặc định (SystemConfig, category "HR &amp; Payroll") cho nhân viên chưa có mức riêng.
/// Fallback biên dịch sẵn là 0 — thiếu cấu hình thì không tự phát sinh tiền.
/// </summary>
public sealed class CommissionDefaults
{
    public const string LaborPercentKey = "HR_COMMISSION_LABOR_PERCENT";
    public const string FixedPerJobKey = "HR_COMMISSION_FIXED_PER_JOB";

    private readonly IAppSettings? _settings;

    public CommissionDefaults(IAppSettings? settings = null) => _settings = settings;

    public CommissionRate Current()
    {
        var percent = _settings?.GetDecimal(LaborPercentKey, 0m) ?? 0m;
        var fixedAmount = _settings?.GetDecimal(FixedPerJobKey, 0m) ?? 0m;
        return new CommissionRate(
            Math.Clamp(percent, 0m, 100m),
            Math.Max(0m, CommissionCalculator.RoundVnd(fixedAmount)),
            IsDefault: true);
    }
}
