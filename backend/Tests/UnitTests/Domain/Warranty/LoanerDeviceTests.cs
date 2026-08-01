using FluentAssertions;
using Warranty.Domain;
using Xunit;

namespace UnitTests.Domain.Warranty;

public class LoanerDeviceTests
{
    private static LoanerDevice New(DateTime? expected = null)
        => new(Guid.NewGuid(), "SN-LOANER-01", Guid.NewGuid(), Guid.NewGuid(),
            expectedReturnDate: expected ?? DateTime.UtcNow.AddDays(7),
            conditionAtLoan: "Đầy đủ phụ kiện");

    [Fact]
    public void KhoiTao_TrangThai_Loaned()
    {
        var l = New();
        l.Status.Should().Be(LoanerStatus.Loaned);
        l.LoanedDate.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void KhoiTao_HạnTraTrongQuaKhu_Throw()
    {
        Assert.Throws<ArgumentException>(() => New(DateTime.UtcNow.AddDays(-1)));
    }

    [Fact]
    public void KhoiTao_SerialRong_Throw()
    {
        Assert.Throws<ArgumentException>(() =>
            new LoanerDevice(Guid.NewGuid(), "", Guid.NewGuid(), Guid.NewGuid(),
                DateTime.UtcNow.AddDays(1), "x"));
    }

    [Fact]
    public void MarkReturned_LuuConditionAtReturn()
    {
        var l = New();
        l.MarkReturned("Vỏ trầy nhẹ", "khách trả đúng hạn");
        l.Status.Should().Be(LoanerStatus.Returned);
        l.ActualReturnDate.Should().NotBeNull();
        l.ConditionAtReturn.Should().Contain("trầy");
    }

    [Fact]
    public void MarkReturned_KhongPhaiLoaned_Throw()
    {
        var l = New();
        l.MarkLost("khách mất");
        Assert.Throws<InvalidOperationException>(() => l.MarkReturned("x"));
    }

    [Fact]
    public void MarkLost_DoiTrangThai()
    {
        var l = New();
        l.MarkLost("mất");
        l.Status.Should().Be(LoanerStatus.Lost);
    }

    [Fact]
    public void MarkDamaged_LuuNotes()
    {
        var l = New();
        l.MarkDamaged("Vỡ màn hình", "khách làm rơi");
        l.Status.Should().Be(LoanerStatus.Damaged);
        l.Notes.Should().Contain("rơi");
    }

    [Fact]
    public void IsOverdue_QuaHạn_TraTrue()
    {
        // Tạo hợp lệ với hạn 1 ngày sau, rồi giả lập now là 2 ngày sau.
        var l = New(DateTime.UtcNow.AddDays(1));
        var now = DateTime.UtcNow.AddDays(2);
        l.IsOverdue(now).Should().BeTrue();
    }

    [Fact]
    public void IsOverdue_DaTra_TraFalse()
    {
        var l = New();
        l.MarkReturned("OK");
        l.IsOverdue(DateTime.UtcNow.AddDays(100)).Should().BeFalse();
    }
}
