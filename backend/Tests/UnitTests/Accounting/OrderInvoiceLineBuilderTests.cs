using Accounting.Application.Invoicing;
using BuildingBlocks.Messaging.IntegrationEvents;
using BuildingBlocks.TaxEngine;
using FluentAssertions;
using Xunit;

namespace UnitTests.Accounting;

/// <summary>
/// W2-14 / D01 — bất biến sống còn: TỔNG HOÁ ĐƠN KHỚP TỔNG ĐƠN HÀNG ĐẾN TỪNG ĐỒNG.
/// Consumer cũ nhân thuế 10% lên giá (và bằng USD), nên mọi hoá đơn sinh ra đều lệch đơn hàng.
/// </summary>
public class OrderInvoiceLineBuilderTests
{
    private static readonly DateOnly InReduction = new(2026, 9, 18);   // trong cửa sổ giảm 2 điểm
    private static readonly DateOnly AfterReduction = new(2027, 1, 15); // sau 31/12/2026 -> 10%

    private static InvoiceLineDto Item(
        decimal payableGross, decimal statutoryRate = 0.10m, bool eligible = true,
        int qty = 1, decimal discount = 0, bool gift = false)
        => new("SKU-1", "Sản phẩm", qty, payableGross, "Cái", statutoryRate, eligible, discount, gift,
            Array.Empty<string>());

    [Fact]
    public void Total_matches_order_total_to_the_dong()
    {
        // Success criteria của phase-52: đơn 12.345.678đ -> hoá đơn đúng 12.345.678đ.
        var lines = OrderInvoiceLineBuilder.Build(
            new[] { Item(12_315_678m) },
            new ShippingLineDto(30_000m, 0.10m),
            InReduction,
            VatReductionWindow.Legal);

        lines.Sum(l => l.GrossAmount).Should().Be(12_345_678m);
        lines.Sum(l => l.NetAmount + l.VatAmount).Should().Be(12_345_678m);
    }

    [Fact]
    public void Vat_is_extracted_from_the_payable_not_added_on_top()
    {
        var lines = OrderInvoiceLineBuilder.Build(
            new[] { Item(1_080_000m) }, null, InReduction, VatReductionWindow.Legal);

        var line = lines.Single();
        line.VatRate.Should().Be(8m, "18/09/2026 nằm trong cửa sổ giảm 2 điểm");
        line.NetAmount.Should().Be(1_000_000m);
        line.VatAmount.Should().Be(80_000m);
        line.GrossAmount.Should().Be(1_080_000m);
    }

    [Fact]
    public void Rate_is_resolved_on_the_invoice_date_not_the_order_date()
    {
        // D01: đơn đặt tháng 12/2026 nhưng lập hoá đơn tháng 01/2027 phải về đúng 10%.
        var lines = OrderInvoiceLineBuilder.Build(
            new[] { Item(1_100_000m) }, null, AfterReduction, VatReductionWindow.Legal);

        lines.Single().VatRate.Should().Be(10m);
        lines.Single().NetAmount.Should().Be(1_000_000m);
        lines.Single().VatAmount.Should().Be(100_000m);
    }

    [Fact]
    public void Mixed_rates_still_reconcile_and_are_split_per_line()
    {
        var lines = OrderInvoiceLineBuilder.Build(
            new[]
            {
                Item(1_080_000m),                                   // 8% sau giảm
                Item(2_200_000m, statutoryRate: 0.10m, eligible: false) // không thuộc diện giảm -> 10%
            },
            new ShippingLineDto(30_000m, 0.10m),
            InReduction,
            VatReductionWindow.Legal);

        lines.Select(l => l.VatRate).Should().Equal(8m, 10m, 10m);
        lines.Sum(l => l.GrossAmount).Should().Be(3_310_000m);
        lines.Sum(l => l.NetAmount + l.VatAmount).Should().Be(3_310_000m);
    }

    [Fact]
    public void Discount_is_visible_on_the_line_not_a_negative_footer_line()
    {
        var lines = OrderInvoiceLineBuilder.Build(
            new[] { Item(900_000m, discount: 100_000m) }, null, InReduction, VatReductionWindow.Legal);

        var line = lines.Single();
        line.GrossBeforeDiscount.Should().Be(1_000_000m);
        line.LineDiscount.Should().Be(100_000m);
        line.GrossAmount.Should().Be(900_000m);
        lines.Should().HaveCount(1, "giảm giá không được tách thành một dòng âm riêng");
    }

    [Fact]
    public void Gift_line_appears_at_zero_with_a_promotional_note()
    {
        var lines = OrderInvoiceLineBuilder.Build(
            new[] { Item(1_080_000m), Item(0m, qty: 1, gift: true) },
            null, InReduction, VatReductionWindow.Legal);

        var gift = lines.Last();
        gift.GrossAmount.Should().Be(0m);
        gift.VatAmount.Should().Be(0m);
        gift.IsPromotion.Should().BeTrue();
        gift.Note.Should().Contain("khuyến mại");
    }

    [Fact]
    public void Shipping_is_its_own_taxed_line()
    {
        var lines = OrderInvoiceLineBuilder.Build(
            new[] { Item(1_080_000m) },
            new ShippingLineDto(30_000m, 0.10m),
            InReduction,
            VatReductionWindow.Legal);

        var shipping = lines.Last();
        shipping.Description.Should().Be("Phí vận chuyển");
        shipping.GrossAmount.Should().Be(30_000m);
        // Phí ship không thuộc diện giảm 2 điểm -> vẫn 10%.
        shipping.VatRate.Should().Be(10m);
        (shipping.NetAmount + shipping.VatAmount).Should().Be(30_000m);
    }

    [Fact]
    public void Rate_expressed_in_percent_is_normalised()
    {
        // Phòng trường hợp module phát sự kiện gửi 10 thay vì 0.10 — hiểu sai đơn vị là sai thuế 100 lần.
        var lines = OrderInvoiceLineBuilder.Build(
            new[] { Item(1_100_000m, statutoryRate: 10m, eligible: false) },
            null, InReduction, VatReductionWindow.Legal);

        lines.Single().VatRate.Should().Be(10m);
        lines.Single().VatAmount.Should().Be(100_000m);
    }
}
