using BuildingBlocks.Endpoints;
using FluentAssertions;
using Repair.Domain;
using Xunit;

namespace UnitTests.Domain.Repair;

/// <summary>
/// Tiền báo giá sửa chữa: làm tròn tới đồng, chia giảm giá cả phiếu về dòng, tách VAT theo dòng.
/// Mọi số là VND nguyên ĐÃ GỒM VAT (D01).
/// </summary>
public class RepairQuoteCalculatorTests
{
    private static RepairQuoteLineDraft Line(RepairQuoteLineKind kind, decimal qty, decimal price, decimal lineDiscount = 0m)
        => new(kind, $"{kind} {price}", qty, price, lineDiscount);

    [Fact]
    public void MotDongCong_TachVat8PhanTram()
    {
        var p = RepairQuoteCalculator.Calculate(new[] { Line(RepairQuoteLineKind.Labor, 1, 540_000) }, 0, 0.08m);

        p.TotalAmount.Should().Be(540_000);
        p.NetAmount.Should().Be(500_000);
        p.VatAmount.Should().Be(40_000);
        p.LaborTotal.Should().Be(540_000);
    }

    [Fact]
    public void SoLuongLe_LamTronToiDong_AwayFromZero()
    {
        // 1,5 giờ × 333.333 = 499.999,5 -> 500.000 (không phải 499.999 kiểu banker's).
        var p = RepairQuoteCalculator.Calculate(new[] { Line(RepairQuoteLineKind.Labor, 1.5m, 333_333) }, 0, 0.08m);

        p.LineAmounts[0].GrossAmount.Should().Be(500_000);
        p.TotalAmount.Should().Be(500_000);
        (p.NetAmount + p.VatAmount).Should().Be(p.TotalAmount);
        decimal.Truncate(p.NetAmount).Should().Be(p.NetAmount, "VND không có phần lẻ");
    }

    [Fact]
    public void GiamGiaCaPhieu_ChiaTheoTiLe_PhanDuChoDongLeLonNhat_TongKhopTuyetDoi()
    {
        var lines = new[]
        {
            Line(RepairQuoteLineKind.Part, 1, 100_000),
            Line(RepairQuoteLineKind.Labor, 1, 200_000),
            Line(RepairQuoteLineKind.Service, 1, 300_000),
        };

        var p = RepairQuoteCalculator.Calculate(lines, 100_001, 0.08m);

        // Chính xác: 16.666,83 / 33.333,67 / 50.000,5 -> floor 16.666/33.333/50.000, dư 2đ cho 2 phần lẻ lớn nhất.
        p.LineAmounts.Select(a => a.AllocatedDiscount).Should().Equal(16_667, 33_334, 50_000);
        p.LineAmounts.Sum(a => a.AllocatedDiscount).Should().Be(100_001);
        p.SubtotalAmount.Should().Be(600_000);
        p.TotalAmount.Should().Be(499_999);
        p.DiscountTotal.Should().Be(100_001);
        (p.PartsTotal + p.LaborTotal + p.ServiceTotal).Should().Be(p.TotalAmount);
    }

    [Fact]
    public void GiamGiaDong_TruTruocKhiChiaGiamGiaPhieu()
    {
        var lines = new[]
        {
            Line(RepairQuoteLineKind.Part, 2, 150_000, lineDiscount: 100_000), // cơ sở 200.000
            Line(RepairQuoteLineKind.Labor, 1, 200_000),                       // cơ sở 200.000
        };

        var p = RepairQuoteCalculator.Calculate(lines, 50_000, 0.10m);

        p.LineAmounts.Select(a => a.AllocatedDiscount).Should().Equal(25_000, 25_000);
        p.LineAmounts.Select(a => a.LineTotal).Should().Equal(175_000, 175_000);
        p.LineDiscountTotal.Should().Be(100_000);
        p.TotalAmount.Should().Be(350_000);
    }

    [Theory]
    [InlineData(0.08)]
    [InlineData(0.10)]
    public void VatTachTheoDong_NetCongVatBangTong(double rate)
    {
        var vatRate = (decimal)rate;
        var lines = new[]
        {
            Line(RepairQuoteLineKind.Part, 1, 290_000),
            Line(RepairQuoteLineKind.Service, 1, 30_000),
            Line(RepairQuoteLineKind.Labor, 3, 99_999),
        };

        var p = RepairQuoteCalculator.Calculate(lines, 12_345, vatRate);

        foreach (var a in p.LineAmounts)
        {
            a.NetAmount.Should().Be(Math.Round(a.LineTotal / (1 + vatRate), 0));
            (a.NetAmount + a.VatAmount).Should().Be(a.LineTotal);
        }
        (p.NetAmount + p.VatAmount).Should().Be(p.TotalAmount);
    }

    [Fact]
    public void ThueSuat0_KhongCoVat()
    {
        var p = RepairQuoteCalculator.Calculate(new[] { Line(RepairQuoteLineKind.Other, 1, 123_456) }, 0, 0m);
        p.VatAmount.Should().Be(0);
        p.NetAmount.Should().Be(123_456);
    }

    [Fact]
    public void KhongCoDong_BiTuChoi()
        => FluentActions.Invoking(() => RepairQuoteCalculator.Calculate(Array.Empty<RepairQuoteLineDraft>(), 0, 0.08m))
            .Should().Throw<RequestValidationException>();

    [Theory]
    [InlineData(1, 100_000.5, 0, 0)]   // đơn giá lẻ đồng
    [InlineData(1, 100_000, 100_001, 0)] // giảm giá dòng > thành tiền
    [InlineData(1.234, 100_000, 0, 0)]   // SL quá 2 chữ số thập phân
    [InlineData(0, 100_000, 0, 0)]       // SL = 0
    [InlineData(1, 100_000, 0, 100_001)] // giảm cả phiếu > tổng
    [InlineData(1, 100_000, 0, 0.5)]     // giảm cả phiếu lẻ đồng
    public void DuLieuSai_BiTuChoi(double qty, double price, double lineDiscount, double quoteDiscount)
    {
        var lines = new[] { Line(RepairQuoteLineKind.Part, (decimal)qty, (decimal)price, (decimal)lineDiscount) };
        FluentActions.Invoking(() => RepairQuoteCalculator.Calculate(lines, (decimal)quoteDiscount, 0.08m))
            .Should().Throw<RequestValidationException>();
    }

    [Fact]
    public void ReplaceLines_ChupSnapshot_TongTheoLoaiCongRaTotalCost()
    {
        var quote = new RepairQuote(Guid.NewGuid(), 1, 200_000);
        var created = quote.ReplaceLines(new[]
        {
            Line(RepairQuoteLineKind.Part, 1, 1_200_000),
            Line(RepairQuoteLineKind.Labor, 1, 300_000),
            Line(RepairQuoteLineKind.Service, 1, 50_000),
        }, 50_000, 0.08m);

        created.Should().HaveCount(3);
        created.Select(l => l.Sequence).Should().Equal(1, 2, 3);
        quote.TotalCost.Should().Be(1_500_000);
        quote.SubtotalAmount.Should().Be(1_550_000);
        quote.DiscountAmount.Should().Be(50_000);
        (quote.NetAmount + quote.VatAmount).Should().Be(quote.TotalCost);
        quote.Lines.Sum(l => l.LineTotal).Should().Be(quote.TotalCost);
    }

    [Fact]
    public void ReplaceLines_BaoGiaDaDuyet_BiChan()
    {
        var quote = new RepairQuote(Guid.NewGuid(), 0, 0);
        quote.ReplaceLines(new[] { Line(RepairQuoteLineKind.Labor, 1, 100_000) }, 0, 0.08m);
        quote.Approve();

        FluentActions.Invoking(() => quote.ReplaceLines(new[] { Line(RepairQuoteLineKind.Labor, 1, 1) }, 0, 0.08m))
            .Should().Throw<InvalidOperationException>();
    }
}
