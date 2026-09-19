using Accounting.Domain;
using FluentAssertions;
using Xunit;

namespace UnitTests.Accounting;

/// <summary>
/// W4-5 / H4 — `POST /api/accounting/ar/{id}/apply-payment` trừ hai lần các khoản đã thu.
///
/// `OutstandingAmount = TotalAmount - PaidAmount` ĐÃ trừ các lần ghi nhận trước; chốt cũ còn cộng
/// `Σ PaymentApplications` vào nữa, nên hoá đơn công nợ/trả góp không bao giờ tất toán được:
/// đúng khoản cuối cùng lấp kín công nợ lại bị từ chối.
/// </summary>
public class InvoiceInstalmentSettlementTests
{
    private static readonly DateTime IssuedAt = new(2026, 9, 18, 3, 0, 0, DateTimeKind.Utc);

    /// <summary>Hoá đơn 1.000.000đ (gồm VAT 8%) đã phát hành.</summary>
    private static Invoice IssuedInvoice(decimal gross = 1_000_000m)
    {
        var invoice = Invoice.CreateReceivable(
            customerId: Guid.NewGuid(), organizationAccountId: null,
            invoiceNumber: "HD-2026-000999",
            issueDate: IssuedAt, dueDate: IssuedAt.AddDays(30));

        var net = Math.Round(gross / 1.08m, 0, MidpointRounding.AwayFromZero);
        invoice.AddLine(InvoiceLine.FromExtracted(
            description: "Máy tính để bàn", quantity: 1, vatRatePercent: 8m,
            grossBeforeDiscount: gross, lineDiscount: 0m,
            grossAmount: gross, netAmount: net, vatAmount: gross - net,
            sku: "PC-01", unitName: "Bộ"));

        invoice.Issue(IssuedAt);
        invoice.TotalAmount.Should().Be(gross);
        return invoice;
    }

    [Fact]
    public void TraGopHaiDot_DotCuoiTatToanDuocHoaDon()
    {
        var invoice = IssuedInvoice();

        invoice.ApplyPayment(Guid.NewGuid(), 400_000m, IssuedAt);
        invoice.OutstandingAmount.Should().Be(600_000m);
        invoice.Status.Should().Be(InvoiceStatus.PartiallyPaid);

        invoice.ApplyPayment(Guid.NewGuid(), 600_000m, IssuedAt.AddDays(10));

        invoice.PaidAmount.Should().Be(1_000_000m);
        invoice.OutstandingAmount.Should().Be(0m);
        invoice.Status.Should().Be(InvoiceStatus.Paid);
        invoice.PaymentApplications.Should().HaveCount(2);
    }

    [Fact]
    public void TraGopNhieuDot_VanChanKhoanVuotPhanConPhaiThu()
    {
        var invoice = IssuedInvoice();

        invoice.ApplyPayment(Guid.NewGuid(), 400_000m, IssuedAt);

        var act = () => invoice.ApplyPayment(Guid.NewGuid(), 600_001m, IssuedAt.AddDays(1));

        act.Should().Throw<InvalidOperationException>("thu vượt công nợ là tiền không có chỗ hạch toán");
        invoice.PaidAmount.Should().Be(400_000m);
        invoice.PaymentApplications.Should().HaveCount(1);
    }
}
