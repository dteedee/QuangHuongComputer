using FluentAssertions;
using Sales.Domain;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// Phase 07: chính sách đổi trả — tính hạn theo Type, hỗ trợ chọn theo Category, restocking fee.
/// </summary>
public class ReturnPolicyTests
{
    [Fact]
    public void AllowedDaysFor_MapDungTheoLoai()
    {
        var p = new ReturnPolicy("default", daysForReturn: 7, daysForExchange: 15, daysForDefectReplace: 30);
        p.AllowedDaysFor(ReturnType.Refund).Should().Be(7);
        p.AllowedDaysFor(ReturnType.Exchange).Should().Be(15);
        p.AllowedDaysFor(ReturnType.Replace).Should().Be(30);
    }

    [Fact]
    public void IsWithinPeriod_TronghạnRefund()
    {
        var p = new ReturnPolicy("default", daysForReturn: 7);
        var purchase = DateTime.UtcNow.AddDays(-3);
        p.IsWithinPeriod(ReturnType.Refund, purchase).Should().BeTrue();
    }

    [Fact]
    public void IsWithinPeriod_NgoaiHạnRefund()
    {
        var p = new ReturnPolicy("default", daysForReturn: 7);
        var purchase = DateTime.UtcNow.AddDays(-8);
        p.IsWithinPeriod(ReturnType.Refund, purchase).Should().BeFalse();
    }

    [Fact]
    public void IsWithinPeriod_Inactive_TraFalse()
    {
        var p = new ReturnPolicy("blocked", daysForReturn: 30, isActive: false);
        p.IsWithinPeriod(ReturnType.Refund, DateTime.UtcNow.AddDays(-1)).Should().BeFalse();
    }

    [Fact]
    public void IsWithinPeriod_Days0_TraFalse()
    {
        // Danh mục "phần mềm bản quyền" — chặn hoàn toàn.
        var p = new ReturnPolicy("software", daysForReturn: 0, daysForExchange: 0, daysForDefectReplace: 0);
        p.IsWithinPeriod(ReturnType.Refund, DateTime.UtcNow).Should().BeFalse();
    }

    [Fact]
    public void RestockingFee_TrongKhoang()
    {
        Assert.Throws<ArgumentException>(() => new ReturnPolicy("x", restockingFeePercent: -1));
        Assert.Throws<ArgumentException>(() => new ReturnPolicy("x", restockingFeePercent: 200));
        var p = new ReturnPolicy("x", restockingFeePercent: 10m);
        p.RestockingFeePercent.Should().Be(10m);
    }

    [Fact]
    public void KhoiTao_NameKhongDuocRong()
    {
        Assert.Throws<ArgumentException>(() => new ReturnPolicy(""));
    }

    [Fact]
    public void DeactivateActivate_DoiTrangThai()
    {
        var p = new ReturnPolicy("x");
        p.IsActive.Should().BeTrue();
        p.Deactivate();
        p.IsActive.Should().BeFalse();
        p.Activate();
        p.IsActive.Should().BeTrue();
    }
}
