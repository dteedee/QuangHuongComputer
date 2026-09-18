namespace BuildingBlocks.Time;

/// <summary>
/// W1-15 / D01 §2 + D06 §3 — nguồn thời gian DUY NHẤT cho mọi mốc pháp lý (thuế, giá, lương).
///
/// Vì sao phải có: mọi ngày hiệu lực trong D01 (01/01/2027 VAT về 10%) và D06
/// (01/01/2026 TNCN + lương tối thiểu vùng, 01/07/2026 lương cơ sở + trần BH + tiền ăn ca)
/// được so theo NGÀY GIỜ VIỆT NAM. Dùng <c>DateTime.UtcNow</c>/<c>DateTime.Today</c> lệch
/// đúng 7 tiếng → một đơn đặt lúc 23:30 đêm giao thừa bị tính sai thuế suất và hai thay đổi
/// luật 2026 bị áp sai kỳ.
///
/// KHÔNG dùng <c>DateTime.Now</c>/<c>DateTime.Today</c>/<c>DateTimeOffset.Now</c> trong code
/// thuế · giá · lương. Inject interface này (test dùng <see cref="FixedBusinessClock"/>).
/// </summary>
public interface IBusinessClock
{
    /// <summary>Thời điểm hiện tại theo UTC (dùng cho audit/timestamp lưu DB).</summary>
    DateTimeOffset UtcNow { get; }

    /// <summary>Giờ treo tường Việt Nam (<c>DateTimeKind.Unspecified</c>) — dùng để hiển thị.</summary>
    DateTime NowVn { get; }

    /// <summary>Ngày làm việc hiện tại theo giờ Việt Nam — dùng cho MỌI so sánh ngày hiệu lực.</summary>
    DateOnly TodayVn { get; }

    /// <summary>Múi giờ đang dùng (Asia/Ho_Chi_Minh, UTC+07:00, không có DST).</summary>
    TimeZoneInfo TimeZone { get; }

    /// <summary>Quy đổi một mốc UTC bất kỳ sang ngày Việt Nam (dùng cho dữ liệu đã lưu).</summary>
    DateOnly ToBusinessDate(DateTimeOffset instant);
}
