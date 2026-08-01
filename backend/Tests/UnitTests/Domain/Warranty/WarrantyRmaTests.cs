using FluentAssertions;
using Warranty.Domain;
using Xunit;

namespace UnitTests.Domain.Warranty;

public class WarrantyRmaTests
{
    private static WarrantyRma NewRma(DateTime? expected = null)
        => new(Guid.NewGuid(), "RMA-001", "[]",
            expectedReturnDate: expected);

    [Fact]
    public void KhoiTao_TrangThai_Draft()
    {
        var rma = NewRma();
        rma.Status.Should().Be(RmaStatus.Draft);
    }

    [Fact]
    public void KhoiTao_RmaNumberRong_Throw()
    {
        Assert.Throws<ArgumentException>(() =>
            new WarrantyRma(Guid.NewGuid(), "", "[]"));
    }

    [Fact]
    public void MarkSent_ChiTuDraft()
    {
        var rma = NewRma();
        rma.MarkSent("ASUS-RMA-123");
        rma.Status.Should().Be(RmaStatus.Sent);
        rma.ExternalRmaCode.Should().Be("ASUS-RMA-123");

        Assert.Throws<InvalidOperationException>(() => rma.MarkSent());
    }

    [Fact]
    public void MarkReceived_YeuCauSent()
    {
        var rma = NewRma();
        Assert.Throws<InvalidOperationException>(() => rma.MarkReceived("Repaired"));
        rma.MarkSent();
        rma.MarkReceived("Repaired", "OK");
        rma.Status.Should().Be(RmaStatus.Received);
        rma.Result.Should().Be("Repaired");
    }

    [Fact]
    public void Close_YeuCauReceived()
    {
        var rma = NewRma();
        rma.MarkSent();
        Assert.Throws<InvalidOperationException>(() => rma.Close());
        rma.MarkReceived("Replaced");
        rma.Close();
        rma.Status.Should().Be(RmaStatus.Closed);
    }

    [Fact]
    public void IsOverdue_SentQuaExpected_TraTrue()
    {
        var rma = NewRma(DateTime.UtcNow.AddDays(-1));
        rma.MarkSent();
        rma.IsOverdue().Should().BeTrue();
    }

    [Fact]
    public void IsOverdue_DaNhanVe_TraFalse()
    {
        var rma = NewRma(DateTime.UtcNow.AddDays(-5));
        rma.MarkSent();
        rma.MarkReceived("Repaired");
        rma.IsOverdue().Should().BeFalse();
    }

    [Fact]
    public void IsOverdue_ChuaHan_TraFalse()
    {
        var rma = NewRma(DateTime.UtcNow.AddDays(3));
        rma.MarkSent();
        rma.IsOverdue().Should().BeFalse();
    }
}
