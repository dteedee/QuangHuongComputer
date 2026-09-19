using Accounting.Application.TaxReporting;
using Accounting.Domain;
using Accounting.Infrastructure;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace UnitTests.Accounting;

/// <summary>
/// W4-5 / H3 — tờ khai 01/GTGT và doanh thu TNDN không được khai vống.
///
/// Hai nguồn khai vống đã đóng ở đây: hoá đơn **nháp/đã huỷ** lọt vào kỳ, và **giấy báo có**
/// (trả hàng / huỷ đơn / hoàn tiền) không bao giờ được đảo ra khỏi doanh thu + thuế đầu ra.
/// </summary>
public class TaxDeclarationCalculatorTests
{
    private static readonly DateTime Start = new(2026, 9, 1, 0, 0, 0, DateTimeKind.Unspecified);
    private static readonly DateTime End = Start.AddMonths(1);
    private static readonly DateTime InPeriod = new(2026, 9, 15, 3, 0, 0, DateTimeKind.Unspecified);

    private static AccountingDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AccountingDbContext>()
            .UseInMemoryDatabase($"accounting-tax-{Guid.NewGuid()}")
            .Options);

    /// <summary>Hoá đơn gross đã gồm VAT 8%.</summary>
    private static Invoice Invoice(InvoiceType type, decimal gross, string number)
    {
        var invoice = type == InvoiceType.Receivable
            ? global::Accounting.Domain.Invoice.CreateReceivable(Guid.NewGuid(), null, number, InPeriod, InPeriod.AddDays(30))
            : global::Accounting.Domain.Invoice.CreatePayable(Guid.NewGuid(), number, InPeriod, InPeriod.AddDays(30));

        var net = Math.Round(gross / 1.08m, 0, MidpointRounding.AwayFromZero);
        invoice.AddLine(InvoiceLine.FromExtracted(
            description: "Hàng hoá", quantity: 1, vatRatePercent: 8m,
            grossBeforeDiscount: gross, lineDiscount: 0m,
            grossAmount: gross, netAmount: net, vatAmount: gross - net));
        return invoice;
    }

    private static CreditNote Adjustment(decimal gross, string number, CreditNoteType type = CreditNoteType.Credit)
    {
        var net = Math.Round(gross / 1.08m, 0, MidpointRounding.AwayFromZero);
        return CreditNote.Create(
            creditNoteNumber: number, sourceKey: $"test:{number}",
            type: type, reasonCode: CreditNoteReason.Return, reason: "Khách trả hàng",
            grossAmount: gross, netAmount: net, vatAmount: gross - net, vatRatePercent: 8m,
            issueDate: InPeriod, businessDate: DateOnly.FromDateTime(InPeriod));
    }

    [Fact]
    public async Task ToKhaiGtgt_BoHoaDonNhapVaHuy_TruGiayBaoCo()
    {
        using var db = NewDb();

        var issued = Invoice(InvoiceType.Receivable, 10_800_000m, "HD-01");
        issued.Issue(InPeriod);

        var draft = Invoice(InvoiceType.Receivable, 5_400_000m, "HD-02"); // chưa phát hành

        var cancelled = Invoice(InvoiceType.Receivable, 2_160_000m, "HD-03");
        cancelled.Issue(InPeriod);
        cancelled.Cancel("Khách đổi ý");

        var payable = Invoice(InvoiceType.Payable, 1_080_000m, "AP-01");
        payable.Issue(InPeriod);

        var creditNote = Adjustment(1_080_000m, "GBC-01");
        creditNote.Issue(InPeriod);

        var cancelledNote = Adjustment(9_999_999m, "GBC-02");
        cancelledNote.Issue(InPeriod);
        cancelledNote.Cancel("Lập nhầm");

        db.Invoices.AddRange(issued, draft, cancelled, payable);
        db.CreditNotes.AddRange(creditNote, cancelledNote);
        await db.SaveChangesAsync();

        var result = await TaxDeclarationCalculator.BuildVatDeclarationAsync(db, Start, End);

        result.OutputInvoiceCount.Should().Be(1, "hoá đơn nháp và hoá đơn đã huỷ không phải chứng từ kê khai");
        result.OutputVat.Should().Be(issued.VatAmount);
        result.AdjustmentCount.Should().Be(1, "giấy báo có đã huỷ không được kê");
        result.AdjustmentVat.Should().Be(-creditNote.VatAmount);
        result.AdjustmentRevenue.Should().Be(-creditNote.NetAmount);

        result.NetOutputVat.Should().Be(issued.VatAmount - creditNote.VatAmount);
        result.NetRevenue.Should().Be(issued.SubTotal - creditNote.NetAmount);
        result.InputInvoiceCount.Should().Be(1);
        result.VatPayable.Should().Be(issued.VatAmount - creditNote.VatAmount - payable.VatAmount);
    }

    [Fact]
    public async Task DoanhThuTndn_BoHoaDonNhapVaHuy_TruGiayBaoCo()
    {
        using var db = NewDb();
        var yearStart = new DateTime(2026, 1, 1);
        var yearEnd = yearStart.AddYears(1);

        var issued = Invoice(InvoiceType.Receivable, 10_800_000m, "HD-01");
        issued.Issue(InPeriod);

        var draft = Invoice(InvoiceType.Receivable, 5_400_000m, "HD-02");

        var cancelled = Invoice(InvoiceType.Receivable, 2_160_000m, "HD-03");
        cancelled.Issue(InPeriod);
        cancelled.Cancel("Khách đổi ý");

        var creditNote = Adjustment(1_080_000m, "GBC-01");
        creditNote.Issue(InPeriod);

        db.Invoices.AddRange(issued, draft, cancelled);
        db.CreditNotes.Add(creditNote);
        await db.SaveChangesAsync();

        var revenue = await TaxDeclarationCalculator.BuildCitRevenueAsync(db, yearStart, yearEnd);

        revenue.Should().Be(issued.SubTotal - creditNote.NetAmount);
    }

    [Fact]
    public async Task GiayBaoNo_LamTangDoanhThu()
    {
        using var db = NewDb();

        var issued = Invoice(InvoiceType.Receivable, 10_800_000m, "HD-01");
        issued.Issue(InPeriod);

        var debitNote = Adjustment(1_080_000m, "GBN-01", CreditNoteType.Debit);
        debitNote.Issue(InPeriod);

        db.Invoices.Add(issued);
        db.CreditNotes.Add(debitNote);
        await db.SaveChangesAsync();

        var result = await TaxDeclarationCalculator.BuildVatDeclarationAsync(db, Start, End);

        result.NetRevenue.Should().Be(issued.SubTotal + debitNote.NetAmount);
        result.NetOutputVat.Should().Be(issued.VatAmount + debitNote.VatAmount);
    }
}
