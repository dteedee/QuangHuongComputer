using FluentAssertions;
using Sales.Application.Pricing;
using Sales.Domain;
using Xunit;

namespace UnitTests.Domain.Sales;

/// <summary>
/// W0-4 / D01 — GOLDEN VECTORS bắt buộc.
/// Giá đã bao gồm VAT: Total = Σgross − D + ship. VAT được TÁCH RA theo TỪNG DÒNG
/// (tách cả đơn lệch 1đ — xem test <see cref="TachTheoDong_KhacTachCaDon_DungMotDong"/>).
/// Giảm giá phân bổ theo largest remainder với đủ 3 chốt chặn của D01.
/// </summary>
public class VatInclusivePricingTests
{
    private const decimal Vat8 = 0.08m;

    private static Order OrderVoiCacDong(decimal taxRate, params decimal[] unitPrices)
    {
        var items = unitPrices
            .Select((p, idx) => new OrderItem(Guid.NewGuid(), $"Hàng {idx + 1}", p, 1))
            .ToList();

        return new Order(
            customerId: Guid.NewGuid(),
            shippingAddress: "test",
            items: items,
            taxRate: taxRate);
    }

    // ---------------------------------------------------------------- golden vectors

    /// <summary>
    /// D01 mục 3 — đơn 3 dòng 27.599.000 / 580.000 / 1.290.000 + coupon 500.000.
    /// Phân bổ 468.272 / 9.841 / 21.887; VAT dòng 2.009.684 / 42.234 / 93.934.
    /// Total 28.969.000, TaxAmount 2.145.852.
    /// </summary>
    [Fact]
    public void GoldenVector_DonBaDongCoCoupon()
    {
        var order = OrderVoiCacDong(Vat8, 27_599_000m, 580_000m, 1_290_000m);

        order.ApplyCoupon("GIAM500K", 500_000m, "{}");

        order.SubtotalAmount.Should().Be(29_469_000m);
        order.Items[0].DiscountAmount.Should().Be(468_272m);
        order.Items[1].DiscountAmount.Should().Be(9_841m);
        order.Items[2].DiscountAmount.Should().Be(21_887m);
        order.TotalAmount.Should().Be(28_969_000m);
        order.TaxAmount.Should().Be(2_145_852m);
    }

    /// <summary>D01 mục 3 — đơn lẻ 1.000.000 → VAT tách ra 74.074 (không phải 80.000 cộng thêm).</summary>
    [Fact]
    public void GoldenVector_MotTrieu_Vat74074()
    {
        var order = OrderVoiCacDong(Vat8, 1_000_000m);

        order.TotalAmount.Should().Be(1_000_000m);
        order.TaxAmount.Should().Be(74_074m);
    }

    /// <summary>
    /// D01 mục 3 — 290.000 + ship 30.000 → Total 320.000, VAT 21.481 + 2.222 = 23.703.
    /// Nếu tách VAT trên cả đơn (320.000) sẽ ra 23.704 → sai 1đ. Đây là lý do phải tách theo dòng.
    /// </summary>
    [Fact]
    public void TachTheoDong_KhacTachCaDon_DungMotDong()
    {
        var order = OrderVoiCacDong(Vat8, 290_000m);
        order.SetShippingAmount(30_000m);

        order.TotalAmount.Should().Be(320_000m);
        order.TaxAmount.Should().Be(23_703m);

        // Chứng minh cách sai: tách một lần trên tổng 320.000 cho ra 23.704.
        var tachCaDon = 320_000m - Math.Round(320_000m / 1.08m, 0);
        tachCaDon.Should().Be(23_704m);
    }

    // ---------------------------------------------------------------- 3 chốt chặn D01

    /// <summary>Chốt chặn 1: D vượt Σgross bị clamp — không có phân bổ âm, không có VAT âm.</summary>
    [Fact]
    public void ChotChan1_GiamGiaVuotTongHang_BiClamp()
    {
        var alloc = DiscountAllocator.Allocate(new[] { 100_000m, 100_000m }, 250_000m);

        alloc.Should().OnlyContain(a => a >= 0);
        alloc.Sum().Should().Be(200_000m);
        alloc[0].Should().Be(100_000m);
        alloc[1].Should().Be(100_000m);

        var totals = DiscountAllocator.ComputeTotals(new[] { 100_000m, 100_000m }, 250_000m, 0m, Vat8);
        totals.EffectiveDiscount.Should().Be(200_000m);
        totals.Total.Should().Be(0m);
        totals.TaxAmount.Should().Be(0m);
    }

    /// <summary>Chốt chặn 2: Σgross = 0 (đơn toàn hàng tặng) → mọi phân bổ = 0, không chia cho 0.</summary>
    [Fact]
    public void ChotChan2_TongHangBangKhong_KhongChiaChoKhong()
    {
        var totals = DiscountAllocator.ComputeTotals(new[] { 0m, 0m }, 50_000m, 0m, Vat8);

        totals.Allocations.Should().OnlyContain(a => a == 0m);
        totals.EffectiveDiscount.Should().Be(0m);
        totals.Total.Should().Be(0m);
        totals.TaxAmount.Should().Be(0m);
    }

    /// <summary>
    /// Chốt chặn 3: hai dòng bằng nhau, dư 1đ → luôn rơi vào dòng ĐẦU (thứ tự dòng),
    /// lặp lại nhiều lần vẫn ra đúng một kết quả (giỏ / đơn / hoá đơn không lệch nhau).
    /// </summary>
    [Fact]
    public void ChotChan3_HoaVi_LuonUuTienDongDauVaOnDinh()
    {
        for (var i = 0; i < 20; i++)
        {
            var alloc = DiscountAllocator.Allocate(new[] { 100_000m, 100_000m }, 1m);
            alloc[0].Should().Be(1m);
            alloc[1].Should().Be(0m);
        }
    }

    // ---------------------------------------------------------------- bất biến

    [Fact]
    public void BatBien_TongPhanBoLuonBangGiamGiaThucTe()
    {
        var lines = new[] { 27_599_000m, 580_000m, 1_290_000m };
        var totals = DiscountAllocator.ComputeTotals(lines, 500_000m, 30_000m, Vat8);

        totals.Allocations.Sum().Should().Be(totals.EffectiveDiscount);
        totals.EffectiveDiscount.Should().Be(500_000m);
        totals.Total.Should().Be(lines.Sum() - 500_000m + 30_000m);
        // Thuế không bao giờ vượt tổng tiền phải trả.
        totals.TaxAmount.Should().BeLessThan(totals.Total);
    }

    [Fact]
    public void ThueSuatBangKhong_KhongTachThue_TongVanDung()
    {
        var totals = DiscountAllocator.ComputeTotals(new[] { 1_000_000m }, 0m, 30_000m, 0m);

        totals.TaxAmount.Should().Be(0m);
        totals.Total.Should().Be(1_030_000m);
    }

    [Fact]
    public void PhiShipAm_CoiNhuKhong()
    {
        var totals = DiscountAllocator.ComputeTotals(new[] { 1_000_000m }, 0m, -5_000m, Vat8);

        totals.ShippingNet.Should().Be(0m);
        totals.Total.Should().Be(1_000_000m);
    }
}
