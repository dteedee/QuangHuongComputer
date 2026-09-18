namespace Reporting.Shared;

/// <summary>
/// W2-16 · phase-54 Requirement 3 — tăng trưởng trung thực: khi không có kỳ trước để so sánh,
/// trả về <c>null</c> + <c>noBaseline: true</c> thay vì suy diễn "100%" (baseline = 0 khiến
/// mọi con số dương trông như tăng vô hạn — dashboard trước đây hiển thị nhầm "100%" cho một
/// cửa hàng vừa mở, chưa hề có "tăng trưởng" nào cả).
/// </summary>
public readonly record struct GrowthResult(decimal? Percent, bool NoBaseline)
{
    /// <summary>Dùng trực tiếp trong payload JSON: <c>{ growthPercent, noBaseline }</c>.</summary>
    public object ToPayload() => new { GrowthPercent = Percent, NoBaseline = NoBaseline };
}

public static class GrowthCalculator
{
    /// <summary>
    /// So sánh kỳ hiện tại với kỳ trước. Baseline = 0 (kể cả khi kỳ hiện tại > 0) nghĩa là
    /// "chưa có dữ liệu so sánh", không phải "tăng 100%".
    /// </summary>
    public static GrowthResult Compare(decimal current, decimal previous)
    {
        if (previous == 0m) return new GrowthResult(null, true);
        var percent = Math.Round((current - previous) / Math.Abs(previous) * 100m, 1);
        return new GrowthResult(percent, false);
    }

    public static GrowthResult Compare(int current, int previous) => Compare((decimal)current, previous);
}
