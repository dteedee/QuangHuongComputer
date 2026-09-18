using BuildingBlocks.Time;
using FluentAssertions;
using Xunit;

namespace UnitTests.Kernel.Tax;

/// <summary>
/// W1-15 / D01 §2 — IBusinessClock. Điểm quan trọng: MỌI mốc hiệu lực thuế/lương được so theo
/// NGÀY VIỆT NAM. Nếu đồng hồ trả về ngày UTC thì đơn đặt 23:30 đêm 31/12 bị tính sai thuế suất
/// và hai thay đổi luật 2026 bị áp sai kỳ.
/// </summary>
public class BusinessClockTests
{
    [Fact]
    public void SystemBusinessClock_DungMuiGioVietNam_Lech7Tieng()
    {
        var clock = new SystemBusinessClock();

        clock.TimeZone.GetUtcOffset(new DateTime(2026, 1, 15, 0, 0, 0, DateTimeKind.Utc))
            .Should().Be(TimeSpan.FromHours(7));
        clock.TimeZone.GetUtcOffset(new DateTime(2026, 7, 15, 0, 0, 0, DateTimeKind.Utc))
            .Should().Be(TimeSpan.FromHours(7), "Việt Nam không có giờ mùa hè (DST) từ 1975");
    }

    [Fact]
    public void SystemBusinessClock_TodayVn_LuonDiTruocHoacBangNgayUtc()
    {
        var clock = new SystemBusinessClock();

        var utcDate = DateOnly.FromDateTime(clock.UtcNow.UtcDateTime);
        clock.TodayVn.Should().BeOnOrAfter(utcDate);
        (clock.TodayVn.DayNumber - utcDate.DayNumber).Should().BeInRange(0, 1);
    }

    /// <summary>16:59:59Z ngày 31/12/2026 vẫn là 31/12 giờ VN; 17:00:00Z đã sang 01/01/2027.</summary>
    [Theory]
    [InlineData("2026-12-31T16:59:59Z", 2026, 12, 31)]
    [InlineData("2026-12-31T17:00:00Z", 2027, 1, 1)]
    [InlineData("2025-12-31T17:00:00Z", 2026, 1, 1)]
    [InlineData("2026-06-30T17:00:00Z", 2026, 7, 1)]
    public void FixedBusinessClock_TodayVn_DoiNgayLuc17hUtc(string utc, int year, int month, int day)
    {
        var clock = FixedBusinessClock.AtUtc(utc);

        clock.TodayVn.Should().Be(new DateOnly(year, month, day));
    }

    [Fact]
    public void FixedBusinessClock_AtVietnamDate_TraVeDungNgayDo()
    {
        var clock = FixedBusinessClock.AtVietnamDate(2026, 9, 18);

        clock.TodayVn.Should().Be(new DateOnly(2026, 9, 18));
        clock.NowVn.Hour.Should().Be(12);
    }

    [Fact]
    public void FixedBusinessClock_Advance_DichDungKhoangThoiGian()
    {
        var clock = FixedBusinessClock.AtUtc("2026-12-31T16:00:00Z");
        clock.TodayVn.Should().Be(new DateOnly(2026, 12, 31));

        clock.Advance(TimeSpan.FromHours(1));

        clock.TodayVn.Should().Be(new DateOnly(2027, 1, 1));
    }

    [Fact]
    public void ToBusinessDate_QuyDoiMocUtcDaLuu_SangNgayVietNam()
    {
        var clock = new SystemBusinessClock();

        clock.ToBusinessDate(DateTimeOffset.Parse("2026-12-31T16:59:59Z"))
            .Should().Be(new DateOnly(2026, 12, 31));
        clock.ToBusinessDate(DateTimeOffset.Parse("2026-12-31T17:00:00Z"))
            .Should().Be(new DateOnly(2027, 1, 1));
    }
}
