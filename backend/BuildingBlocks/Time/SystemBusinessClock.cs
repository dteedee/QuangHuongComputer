namespace BuildingBlocks.Time;

/// <summary>
/// <see cref="IBusinessClock"/> chạy trên đồng hồ hệ thống, quy đổi sang giờ Việt Nam.
/// Singleton, thuần đọc, không giữ trạng thái.
/// </summary>
public sealed class SystemBusinessClock : IBusinessClock
{
    /// <summary>Id IANA — Linux/macOS/.NET 8 trên Windows (ICU).</summary>
    public const string IanaTimeZoneId = "Asia/Ho_Chi_Minh";

    /// <summary>Id Windows registry — fallback khi image không có tzdata IANA.</summary>
    public const string WindowsTimeZoneId = "SE Asia Standard Time";

    /// <summary>Độ lệch cố định của Việt Nam. Không có DST kể từ 1975.</summary>
    public static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    private static readonly TimeZoneInfo VietnamTimeZone = ResolveTimeZone();

    public TimeZoneInfo TimeZone => VietnamTimeZone;

    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;

    public DateTime NowVn => TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, VietnamTimeZone).DateTime;

    public DateOnly TodayVn => DateOnly.FromDateTime(NowVn);

    public DateOnly ToBusinessDate(DateTimeOffset instant)
        => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, VietnamTimeZone).DateTime);

    /// <summary>
    /// IANA trước (đúng trên image Linux của dự án), rồi id Windows, cuối cùng là một múi giờ
    /// tự dựng +07:00. Không bao giờ ném: một máy chủ thiếu tzdata vẫn phải tính đúng thuế.
    /// </summary>
    internal static TimeZoneInfo ResolveTimeZone()
    {
        foreach (var id in new[] { IanaTimeZoneId, WindowsTimeZoneId })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
                // thử id kế tiếp
            }
            catch (InvalidTimeZoneException)
            {
                // dữ liệu tz hỏng — thử id kế tiếp
            }
        }

        return TimeZoneInfo.CreateCustomTimeZone(
            id: "QH-Vietnam-Fixed+07",
            baseUtcOffset: VietnamOffset,
            displayName: "(UTC+07:00) Vietnam (fallback)",
            standardDisplayName: "Vietnam Time");
    }
}
