namespace BuildingBlocks.Time;

/// <summary>
/// <see cref="IBusinessClock"/> đứng yên — dùng cho unit test biên ngày
/// (VAT 8% → 10% lúc 2026-12-31T17:00:00Z, TNCN 01/01/2026, trần BH 01/07/2026).
/// Cùng múi giờ với <see cref="SystemBusinessClock"/> nên test đo đúng hành vi production.
/// </summary>
public sealed class FixedBusinessClock : IBusinessClock
{
    public FixedBusinessClock(DateTimeOffset utcNow)
    {
        UtcNow = utcNow.ToUniversalTime();
    }

    /// <summary>Dựng đồng hồ từ một NGÀY Việt Nam (12:00 trưa giờ VN — tránh mọi biên).</summary>
    public static FixedBusinessClock AtVietnamDate(int year, int month, int day)
    {
        var noonVn = new DateTimeOffset(year, month, day, 12, 0, 0, SystemBusinessClock.VietnamOffset);
        return new FixedBusinessClock(noonVn);
    }

    /// <summary>Dựng đồng hồ từ một mốc UTC chính xác (dùng cho test biên 16:59:59 / 17:00:00).</summary>
    public static FixedBusinessClock AtUtc(string iso8601)
        => new(DateTimeOffset.Parse(iso8601, System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal));

    public DateTimeOffset UtcNow { get; private set; }

    public TimeZoneInfo TimeZone => SystemBusinessClock.ResolveTimeZone();

    public DateTime NowVn => TimeZoneInfo.ConvertTime(UtcNow, TimeZone).DateTime;

    public DateOnly TodayVn => DateOnly.FromDateTime(NowVn);

    public DateOnly ToBusinessDate(DateTimeOffset instant)
        => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, TimeZone).DateTime);

    /// <summary>Dịch đồng hồ — cho test chuỗi sự kiện theo thời gian.</summary>
    public void Advance(TimeSpan delta) => UtcNow = UtcNow.Add(delta);

    /// <summary>Đặt lại mốc tuyệt đối.</summary>
    public void Set(DateTimeOffset utcNow) => UtcNow = utcNow.ToUniversalTime();
}
