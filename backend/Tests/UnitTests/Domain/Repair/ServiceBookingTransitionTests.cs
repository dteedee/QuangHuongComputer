using BuildingBlocks.Configuration;
using FluentAssertions;
using Repair.Application.Bookings;
using Repair.Domain;
using Xunit;

namespace UnitTests.Domain.Repair;

/// <summary>Luật chuyển trạng thái lịch hẹn (gồm "Khách không đến") và sức chứa khung giờ.</summary>
public class ServiceBookingTransitionTests
{
    private static readonly RepairServiceType InShop =
        new("IN_SHOP", "Sửa chữa tại cửa hàng", null, 0, 60, isOnSite: false, sortOrder: 10);

    private static ServiceBooking NewBooking(DateTime day) => new(
        Guid.NewGuid(), InShop, "Dell XPS 13", "Không sạc được", day, TimeSlot.Morning,
        acceptedTerms: true, "Nguyễn Văn A", "0912345678", "a@example.com");

    private static readonly DateOnly Today = new(2026, 9, 27);

    [Fact]
    public void KhachKhongDen_TuChoDuyetHoacDaDuyet_KhiDaToiNgayHen()
    {
        var pending = NewBooking(new DateTime(2026, 9, 27));
        pending.MarkNoShow(Today);
        pending.Status.Should().Be(BookingStatus.NoShow);
        pending.NoShowAt.Should().NotBeNull();

        var approved = NewBooking(new DateTime(2026, 9, 25));
        approved.Approve();
        approved.MarkNoShow(Today);
        approved.Status.Should().Be(BookingStatus.NoShow);
    }

    [Fact]
    public void KhachKhongDen_TruocNgayHen_BiChan()
    {
        var booking = NewBooking(new DateTime(2026, 9, 28));
        FluentActions.Invoking(() => booking.MarkNoShow(Today)).Should().Throw<InvalidOperationException>();
        booking.Status.Should().Be(BookingStatus.Pending);
    }

    [Fact]
    public void TrangThaiCuoi_KhongChuyenTiepDuoc()
    {
        var rejected = NewBooking(new DateTime(2026, 9, 27));
        rejected.Reject("trùng lịch");
        FluentActions.Invoking(() => rejected.MarkNoShow(Today)).Should().Throw<InvalidOperationException>();
        FluentActions.Invoking(() => rejected.LinkWorkOrder(Guid.NewGuid())).Should().Throw<InvalidOperationException>();

        var noShow = NewBooking(new DateTime(2026, 9, 27));
        noShow.MarkNoShow(Today);
        FluentActions.Invoking(() => noShow.Approve()).Should().Throw<InvalidOperationException>();
        FluentActions.Invoking(() => noShow.LinkWorkOrder(Guid.NewGuid())).Should().Throw<InvalidOperationException>();

        var converted = NewBooking(new DateTime(2026, 9, 27));
        converted.LinkWorkOrder(Guid.NewGuid());
        FluentActions.Invoking(() => converted.MarkNoShow(Today)).Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void NgayHen_ChiGiuNgay_DeDemSucChua()
    {
        var booking = NewBooking(new DateTime(2026, 9, 30, 15, 45, 0));
        booking.PreferredDate.Should().Be(new DateTime(2026, 9, 30, 0, 0, 0, DateTimeKind.Utc));
        booking.PreferredDay.Should().Be(new DateOnly(2026, 9, 30));
    }

    [Theory]
    [InlineData(BookingStatus.Pending, true)]
    [InlineData(BookingStatus.Approved, true)]
    [InlineData(BookingStatus.Converted, true)]
    [InlineData(BookingStatus.Rejected, false)]
    [InlineData(BookingStatus.NoShow, false)]
    public void ChiLichConHieuLuc_ChiemCho(BookingStatus status, bool occupies)
        => ServiceBooking.OccupiesSlot(status).Should().Be(occupies);

    [Theory]
    [InlineData(0, 3, true)]
    [InlineData(2, 3, true)]
    [InlineData(3, 3, false)]
    [InlineData(99, 0, true)]   // 0 = không giới hạn
    [InlineData(99, -1, true)]
    public void SucChua_ConCho(int occupied, int capacity, bool hasRoom)
        => BookingSlotCapacity.HasRoom(occupied, capacity).Should().Be(hasRoom);

    [Fact]
    public void SucChua_KhoaRiengTheoKhungGio_UuTienCauHinhKhungRoiToiCauHinhChung()
    {
        var settings = new DictionarySettings(new()
        {
            ["Repair.BookingSlotCapacity"] = "4",
            ["Repair.BookingSlotCapacity.Evening"] = "1",
        });

        BookingSlotCapacity.Resolve(settings, TimeSlot.Morning).Should().Be(4);
        BookingSlotCapacity.Resolve(settings, TimeSlot.Evening).Should().Be(1);
        BookingSlotCapacity.Resolve(new DictionarySettings(new()), TimeSlot.Afternoon)
            .Should().Be(BookingSlotCapacity.DefaultCapacity);
        BookingSlotCapacity.Remaining(5, 4).Should().Be(0);
        BookingSlotCapacity.Remaining(5, 0).Should().BeNull();
    }

    [Fact]
    public void KhoaCoVan_KhacNhauTheoNgayVaKhung_VuaInt32()
    {
        var a = BookingSlotCapacity.LockKey(new DateOnly(2026, 9, 30), TimeSlot.Morning);
        var b = BookingSlotCapacity.LockKey(new DateOnly(2026, 9, 30), TimeSlot.Evening);
        var c = BookingSlotCapacity.LockKey(new DateOnly(2026, 10, 1), TimeSlot.Morning);

        new[] { a.Key, b.Key, c.Key }.Should().OnlyHaveUniqueItems();
        BookingSlotCapacity.LockKey(new DateOnly(9999, 12, 31), TimeSlot.Evening).Key.Should().BePositive();
    }

    private sealed class DictionarySettings : IAppSettings
    {
        private readonly Dictionary<string, string> _values;
        public DictionarySettings(Dictionary<string, string> values) => _values = values;
        public string GetString(string key, string fallback) => _values.TryGetValue(key, out var v) ? v : fallback;
        public int GetInt(string key, int fallback) => _values.TryGetValue(key, out var v) && int.TryParse(v, out var i) ? i : fallback;
        public decimal GetDecimal(string key, decimal fallback) => fallback;
        public bool GetBool(string key, bool fallback) => fallback;
        public void Invalidate() { }
    }
}
