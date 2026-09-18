using BuildingBlocks.Time;

namespace Reporting.Shared;

/// <summary>
/// W2-16 · phase-54 Requirement 5 — biên kỳ báo cáo theo NGÀY VIỆT NAM qua <see cref="IBusinessClock"/>,
/// không <c>DateTime.UtcNow</c> (lệch 7 tiếng: một đơn đặt 23:30 đêm 30 Tết rơi nhầm kỳ). Cũng validate
/// input để một chuỗi rác không lặng lẽ rơi về mặc định.
/// </summary>
public readonly record struct ReportPeriod(DateTime Start, DateTime End)
{
    /// <summary>
    /// Parse <paramref name="startDate"/>/<paramref name="endDate"/> (yyyy-MM-dd) nếu có, hoặc mặc định
    /// <paramref name="defaultSpanMonths"/> tháng gần nhất kết thúc CUỐI ngày hôm nay theo giờ VN.
    /// Ném <see cref="ArgumentException"/> khi chuỗi có mặt nhưng không parse được, hoặc start &gt;= end.
    /// </summary>
    public static ReportPeriod Resolve(IBusinessClock clock, string? startDate, string? endDate, int defaultSpanMonths = 3)
    {
        var todayVn = clock.TodayVn.ToDateTime(TimeOnly.MinValue);
        var end = todayVn.AddDays(1); // exclusive upper bound = start of tomorrow, VN day boundary

        if (!string.IsNullOrWhiteSpace(endDate))
        {
            if (!DateTime.TryParse(endDate, out var parsedEnd))
                throw new ArgumentException($"endDate không hợp lệ: '{endDate}'.");
            end = parsedEnd.Date.AddDays(1);
        }

        var start = end.AddMonths(-defaultSpanMonths);
        if (!string.IsNullOrWhiteSpace(startDate))
        {
            if (!DateTime.TryParse(startDate, out var parsedStart))
                throw new ArgumentException($"startDate không hợp lệ: '{startDate}'.");
            start = parsedStart.Date;
        }

        if (start >= end)
            throw new ArgumentException($"startDate ({start:yyyy-MM-dd}) phải trước endDate ({end:yyyy-MM-dd}).");

        return new ReportPeriod(start, end);
    }

    /// <summary>Kỳ trước liền kề, cùng độ dài — dùng cho <see cref="GrowthCalculator"/>.</summary>
    public ReportPeriod PreviousComparable()
    {
        var span = End - Start;
        return new ReportPeriod(Start - span, Start);
    }
}
