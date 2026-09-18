using BuildingBlocks.TaxEngine;
using FluentAssertions;
using Xunit;

namespace UnitTests.Kernel.Tax;

/// <summary>
/// W1-15 / D01 §3 — GOLDEN VECTORS. Đây là hợp đồng số học của toàn bộ đường tiền:
/// giá ĐÃ GỒM VAT, phân bổ giảm giá số dư lớn nhất, tách VAT THEO DÒNG.
/// Mọi con số dưới đây đã được tính lại độc lập bằng script Decimal trong phiên phản biện D01.
/// </summary>
public class VatGoldenVectorTests
{
    private const decimal Reduced = 0.08m;

    /// <summary>Đơn 3 dòng + coupon 500.000 @8% — vector chuẩn của D01 §3.</summary>
    [Fact]
    public void GoldenVector_Don3Dong_Coupon500k_KhopTungDong()
    {
        var lines = new[]
        {
            new DiscountLine(1, 27_599_000m),
            new DiscountLine(2, 580_000m),
            new DiscountLine(3, 1_290_000m)
        };

        var alloc = DiscountAllocator.Allocate(lines, 500_000m);

        alloc.Should().Equal(468_272m, 9_841m, 21_887m);
        alloc.Sum().Should().Be(500_000m);

        var breakdowns = lines
            .Select((line, i) => VietnameseTaxEngine.ExtractVatLine(line.Gross, 1m, 0m, alloc[i], Reduced))
            .ToArray();

        breakdowns.Select(b => b.NetAmount).Should().Equal(25_121_044m, 527_925m, 1_174_179m);
        breakdowns.Select(b => b.VatAmount).Should().Equal(2_009_684m, 42_234m, 93_934m);

        var subtotal = lines.Sum(l => l.Gross);
        var total = subtotal - alloc.Sum();
        var tax = breakdowns.Sum(b => b.VatAmount);

        total.Should().Be(28_969_000m);
        tax.Should().Be(2_145_852m);
        breakdowns.Sum(b => b.NetAmount + b.VatAmount).Should().Be(total, "Σ(net + vat) phải bằng tổng đơn");
    }

    [Fact]
    public void GoldenVector_MotTrieuDong_Vat74074()
    {
        var result = VietnameseTaxEngine.ExtractVat(1_000_000m, Reduced);

        result.PriceBeforeVat.Should().Be(925_926m);
        result.VatAmount.Should().Be(74_074m);
    }

    /// <summary>
    /// 290.000 + ship 30.000: tách THEO DÒNG ra 21.481 + 2.222 = 23.703.
    /// Tách cả đơn (320.000) ra 23.704 — lệch 1đ, đó là lý do D01 bắt buộc tách theo dòng.
    /// </summary>
    [Fact]
    public void GoldenVector_290kCongShip30k_TachTheoDong_Tax23703()
    {
        var line = VietnameseTaxEngine.ExtractVat(290_000m, Reduced);
        var shipping = VietnameseTaxEngine.ExtractVat(30_000m, Reduced);

        line.VatAmount.Should().Be(21_481m);
        shipping.VatAmount.Should().Be(2_222m);
        (line.VatAmount + shipping.VatAmount).Should().Be(23_703m);
        (line.PriceAfterVat + shipping.PriceAfterVat).Should().Be(320_000m);

        VietnameseTaxEngine.ExtractVat(320_000m, Reduced).VatAmount
            .Should().Be(23_704m, "tách cả đơn lệch 1đ — không được dùng");
    }

    /// <summary>Đơn ĐA THUẾ SUẤT 8/10/5% + giảm 1.000.000 + ship 50.000 @10%: mọi bất biến giữ nguyên.</summary>
    [Fact]
    public void DonDaThueSuat_MoiBatBienGiuNguyen()
    {
        var lines = new[]
        {
            new DiscountLine(1, 12_345_678m),
            new DiscountLine(2, 3_210_000m),
            new DiscountLine(3, 987_654m)
        };
        var rates = new[] { 0.08m, 0.10m, 0.05m };
        const decimal discount = 1_000_000m;
        const decimal shippingGross = 50_000m;
        const decimal shippingRate = 0.10m;

        var alloc = DiscountAllocator.Allocate(lines, discount);
        alloc.Sum().Should().Be(discount);

        var breakdowns = lines
            .Select((line, i) => VietnameseTaxEngine.ExtractVatLine(line.Gross, 1m, 0m, alloc[i], rates[i]))
            .ToList();
        breakdowns.Add(VietnameseTaxEngine.ExtractVatLine(shippingGross, 1m, 0m, 0m, shippingRate));

        var subtotal = lines.Sum(l => l.Gross);
        var total = subtotal - discount + shippingGross;

        breakdowns.Sum(b => b.Payable).Should().Be(total);
        breakdowns.Sum(b => b.NetAmount + b.VatAmount).Should().Be(total);
        breakdowns.Should().OnlyContain(b => b.NetAmount >= 0m && b.VatAmount >= 0m);
        breakdowns.Should().OnlyContain(b => decimal.Truncate(b.NetAmount) == b.NetAmount);
        breakdowns.Should().OnlyContain(b => decimal.Truncate(b.VatAmount) == b.VatAmount);
    }

    [Fact]
    public void ExtractVatLine_HienRoKhoanGiamGiaTrenDong()
    {
        var line = VietnameseTaxEngine.ExtractVatLine(
            unitPriceIncludingVat: 1_000_000m,
            quantity: 3m,
            lineDiscount: 100_000m,
            allocatedOrderDiscount: 50_000m,
            vatRate: Reduced);

        line.GrossBeforeDiscount.Should().Be(3_000_000m);
        line.LineDiscount.Should().Be(150_000m);
        line.Payable.Should().Be(2_850_000m);
        (line.NetAmount + line.VatAmount).Should().Be(line.Payable);
    }

    [Fact]
    public void ExtractVatLine_GiamGiaVuotTienHang_BiKep()
    {
        var line = VietnameseTaxEngine.ExtractVatLine(100_000m, 1m, 200_000m, 0m, Reduced);

        line.Payable.Should().Be(0m);
        line.VatAmount.Should().Be(0m);
        line.NetAmount.Should().Be(0m);
    }

    /// <summary>
    /// Bất biến của D01: với 5/8/10% và payable nguyên, <c>payable/(1+rate)</c> không bao giờ rơi
    /// đúng .5 — nên ToEven và AwayFromZero cho cùng kết quả ở bước tách VAT.
    /// </summary>
    [Theory]
    [InlineData(0.05)]
    [InlineData(0.08)]
    [InlineData(0.10)]
    public void TachVat_KhongBaoGioRoiDungNuaDong(double rateRaw)
    {
        var rate = (decimal)rateRaw;

        for (var gross = 1m; gross <= 20_000m; gross++)
        {
            var exact = gross / (1 + rate);
            var fraction = exact - decimal.Floor(exact);
            fraction.Should().NotBe(0.5m);
        }
    }
}
