using FluentAssertions;
using Sales.Application.Pricing;
using Sales.Application.Pricing.Bundles;
using Xunit;
using static UnitTests.Domain.Sales.Bundles.BundleTestData;

namespace UnitTests.Domain.Sales.Bundles;

/// <summary>Giá combo tính ở server: đủ điều kiện mới giảm, và giảm chia về dòng không lệch 1đ.</summary>
public class BundleCartPricerTests
{
    private static readonly DateTime Now = DateTime.UtcNow;

    [Fact]
    public void ComboHopLe_GiaCoDinh_GiamDungChenhLech_VaChiaHetVeDong()
    {
        var bundle = FixedCombo();
        var result = BundleCartPricer.Price(ComboLines(bundle.Id), Map(bundle), null, Now);

        var group = result.Groups.Single();
        group.IsApplied.Should().BeTrue();
        group.Discount.Should().Be(600_000m);
        (result.DiscountFor(0) + result.DiscountFor(1)).Should().Be(600_000m, "Σ phân bổ == tiền giảm, không lệch 1đ");
        result.IsLocked(0).Should().BeTrue();
        result.IsLocked(1).Should().BeTrue();
        // Largest remainder theo tỉ lệ giá: 600.000 × 20tr/20,5tr = 585.365,85… → 585.366 (phần lẻ lớn hơn).
        result.DiscountFor(0).Should().Be(585_366m);
        result.DiscountFor(1).Should().Be(14_634m);
    }

    [Fact]
    public void ComboTheoPhanTram_HaiBo_GiamTheoGiaLeHienHanh()
    {
        var bundle = PercentCombo(10m);
        var result = BundleCartPricer.Price(ComboLines(bundle.Id, sets: 2), Map(bundle), null, Now);

        var group = result.Groups.Single();
        group.Sets.Should().Be(2);
        group.ListTotal.Should().Be(41_000_000m);
        group.Discount.Should().Be(4_100_000m);
        result.TotalDiscount.Should().Be(4_100_000m);
    }

    [Fact]
    public void GiamComboChiaVeDong_VatTheoDongVanDung()
    {
        var bundle = FixedCombo(19_999_999m);
        var result = BundleCartPricer.Price(ComboLines(bundle.Id), Map(bundle), null, Now);

        var totals = OrderTotalsCalculator.Compute(new[]
        {
            new TotalsLineInput(1, LaptopPrice, 1, result.DiscountFor(0), 0.08m, false, result.IsLocked(0)),
            new TotalsLineInput(2, MousePrice, 1, result.DiscountFor(1), 0.10m, false, result.IsLocked(1)),
        }, 0m, 0m, 0m, 0m);

        totals.Total.Should().Be(19_999_999m, "khách trả đúng giá combo");
        totals.Lines.Sum(l => l.NetAmount + l.VatAmount).Should().Be(totals.Total);
        totals.Lines.Should().OnlyContain(l => l.Payable >= 0 && l.VatAmount >= 0);
    }

    [Fact]
    public void ComboHetHan_HoacChuaBatDau_KhongGiam()
    {
        var expired = FixedCombo(from: Now.AddDays(-10), to: Now.AddDays(-1));
        var future = FixedCombo(from: Now.AddDays(1), to: Now.AddDays(5));

        var a = BundleCartPricer.Price(ComboLines(expired.Id), Map(expired), null, Now);
        var b = BundleCartPricer.Price(ComboLines(future.Id), Map(future), null, Now);

        a.Groups.Single().Reason.Should().Be("Combo đã hết hạn");
        b.Groups.Single().Reason.Should().Be("Combo chưa đến thời gian áp dụng");
        a.TotalDiscount.Should().Be(0m);
        a.IsLocked(0).Should().BeFalse("combo không áp dụng thì dòng được coi là dòng lẻ");
    }

    [Fact]
    public void ComboDaTat_HoacKhongTonTai_KhongGiam()
    {
        var bundle = FixedCombo();
        bundle.SetActive(false);

        BundleCartPricer.Price(ComboLines(bundle.Id), Map(bundle), null, Now).TotalDiscount.Should().Be(0m);
        BundleCartPricer.Price(ComboLines(Guid.NewGuid()), Map(bundle), null, Now)
            .Groups.Single().Reason.Should().Be("Combo đã ngừng áp dụng");
    }

    [Fact]
    public void ComboThieuMon_VoNhom_KhongGiam()
    {
        var bundle = FixedCombo();
        var lines = ComboLines(bundle.Id).Take(1).ToList();

        var result = BundleCartPricer.Price(lines, Map(bundle), null, Now);

        result.Groups.Single().IsApplied.Should().BeFalse();
        result.Groups.Single().Reason.Should().Be("Combo thiếu sản phẩm");
        result.TotalDiscount.Should().Be(0m);
    }

    [Fact]
    public void SoLuongLechTiLe_KhongGiam()
    {
        var bundle = FixedCombo();
        var lines = new List<BundleCartLine>
        {
            new(0, Laptop, null, LaptopPrice, 2, bundle.Id),
            new(1, Mouse, null, MousePrice, 1, bundle.Id),
        };

        BundleCartPricer.Price(lines, Map(bundle), null, Now)
            .Groups.Single().Reason.Should().Be("Số lượng không đúng tỉ lệ combo");
    }

    [Fact]
    public void HetHang_KhongGiam_TinhCaDongLeCungSanPham()
    {
        var bundle = FixedCombo();
        var lines = ComboLines(bundle.Id);
        lines.Add(new BundleCartLine(2, Mouse, null, MousePrice, 1, null));
        var stock = new Dictionary<(Guid, Guid?), int> { [(Laptop, null)] = 5, [(Mouse, null)] = 1 };

        var result = BundleCartPricer.Price(lines, Map(bundle), stock, Now);

        result.Groups.Single().Reason.Should().Be("Sản phẩm trong combo không đủ hàng");
    }

    [Fact]
    public void GiaComboKhongReHonGiaLe_KhongKhoaDong()
    {
        var bundle = FixedCombo(price: 25_000_000m);
        var result = BundleCartPricer.Price(ComboLines(bundle.Id), Map(bundle), null, Now);

        result.Groups.Single().IsApplied.Should().BeFalse();
        result.IsLocked(0).Should().BeFalse();
    }
}
