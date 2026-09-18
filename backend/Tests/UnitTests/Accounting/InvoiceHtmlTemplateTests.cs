using Accounting.Domain;
using Accounting.Infrastructure.EInvoice;
using Accounting.Templates;
using FluentAssertions;
using Xunit;

namespace UnitTests.Accounting;

/// <summary>
/// Bản in hoá đơn (W2-24 / D07).
///
/// Bản test cũ dựng HTML bằng một hàm riêng NẰM TRONG CHÍNH FILE TEST, nên nó không kiểm tra
/// <see cref="InvoiceHtmlTemplate"/> một dòng nào: template có in sai địa chỉ ("Huyện Vĩnh Bảo")
/// hay thiếu dấu chìm mô phỏng thì test vẫn xanh. Ở đây gọi thẳng template thật.
/// </summary>
public class InvoiceHtmlTemplateTests
{
    private static readonly DateTime IssuedAt = new(2026, 9, 18, 3, 0, 0, DateTimeKind.Utc);

    private static Invoice BuildInvoice(
        string? buyerTaxCode = null, decimal lineDiscount = 0m, bool isPromotion = false,
        bool anonymousBuyer = false)
    {
        var invoice = Invoice.CreateReceivable(
            customerId: Guid.NewGuid(), organizationAccountId: null,
            invoiceNumber: "HD-2026-000123",
            issueDate: IssuedAt, dueDate: IssuedAt.AddDays(30));

        if (!anonymousBuyer)
        {
            invoice.SetBuyer(
            buyerType: buyerTaxCode == null ? "Individual" : "Company",
            legalName: buyerTaxCode == null ? null : "Công ty TNHH Khách Hàng A",
            fullName: buyerTaxCode == null ? "Nguyễn Văn A" : null,
            taxCode: buyerTaxCode, budgetUnitCode: null,
            address: "123 Đường Lê Lợi, Hà Nội", email: null, phone: null);
        }

        // Giá bán ĐÃ gồm VAT 8%: gross 10.800.000 - giảm giá -> tách net/vat (D01 §3.1).
        var gross = 10_800_000m - lineDiscount;
        var net = Math.Round(gross / 1.08m, 0, MidpointRounding.AwayFromZero);
        invoice.AddLine(InvoiceLine.FromExtracted(
            description: "Laptop Dell Inspiron 15",
            quantity: 1, vatRatePercent: 8m,
            grossBeforeDiscount: 10_800_000m, lineDiscount: lineDiscount,
            grossAmount: gross, netAmount: net, vatAmount: gross - net,
            sku: "DELL-INS15", unitName: "Chiếc", isPromotion: isPromotion));

        invoice.Issue(IssuedAt);
        return invoice;
    }

    [Fact]
    public void Render_UsesCompanyBlockFromConfiguration_NotHardcodedConstants()
    {
        var company = new CompanyProfileOptions
        {
            Name = "Công ty TNHH Kiểm Thử",
            Address = "Số 1 Đường Thử Nghiệm, Xã Vĩnh Bảo, TP Hải Phòng",
            TaxCode = "9999999999",
            Phone = "0225 0000000",
            Representative = "Người Đại Diện"
        };

        var html = InvoiceHtmlTemplate.Render(BuildInvoice(), company);

        html.Should().Contain(company.Name);
        html.Should().Contain(company.Address);
        html.Should().Contain(company.TaxCode);
        html.Should().Contain(company.Phone);
        html.Should().Contain(company.Representative);
    }

    [Fact]
    public void Render_DefaultCompanyBlock_DoesNotPrintAbolishedAdministrativeUnit()
    {
        var html = InvoiceHtmlTemplate.Render(BuildInvoice());

        html.Should().NotContain("Huyện Vĩnh Bảo");
        html.Should().Contain(new CompanyProfileOptions().Address);
        html.Should().Contain("0200807633");
    }

    [Fact]
    public void Render_SandboxMode_StampsWatermark()
    {
        var options = new EInvoiceOptions { Mode = EInvoiceMode.Sandbox };

        var html = InvoiceHtmlTemplate.Render(BuildInvoice(), null, options);

        html.Should().Contain(InvoiceHtmlTemplate.SandboxWatermark);
        html.Should().Contain("class='watermark'");
    }

    [Fact]
    public void Render_ExternalMode_HasNoWatermark()
    {
        var options = new EInvoiceOptions { Mode = EInvoiceMode.External };

        var html = InvoiceHtmlTemplate.Render(BuildInvoice(), null, options);

        html.Should().NotContain(InvoiceHtmlTemplate.SandboxWatermark);
    }

    [Fact]
    public void Render_NeverClaimsTaxAuthoritySignatureOrLookupSite()
    {
        var html = InvoiceHtmlTemplate.Render(BuildInvoice(), null, new EInvoiceOptions { Mode = EInvoiceMode.Sandbox });

        html.Should().NotContain("SignedByCQT");
        html.Should().NotContain("hoadondientu.gdt.gov.vn");
    }

    [Fact]
    public void Render_ShowsPerLineDiscountColumn_PerDecree254Article10_1_k()
    {
        var html = InvoiceHtmlTemplate.Render(BuildInvoice(lineDiscount: 800_000m));

        html.Should().Contain("Giảm giá");
        html.Should().Contain($"{800_000m:N0} đ");
    }

    [Fact]
    public void Render_ShowsUnitNameAndVatRatePerLine()
    {
        var html = InvoiceHtmlTemplate.Render(BuildInvoice());

        html.Should().Contain("Chiếc");
        html.Should().Contain("8%");
    }

    [Fact]
    public void Render_PromotionLine_IsLabelled()
    {
        var html = InvoiceHtmlTemplate.Render(BuildInvoice(isPromotion: true));

        html.Should().Contain("hàng khuyến mại không thu tiền");
    }

    [Fact]
    public void Render_BuyerWithoutAnyIdentifier_PrintsConsumerLabel()
    {
        var html = InvoiceHtmlTemplate.Render(BuildInvoice(anonymousBuyer: true));

        html.Should().Contain(EInvoiceBuyer.ConsumerLabel);
    }

    [Fact]
    public void Render_BuyerWithTaxCode_PrintsLegalNameAndTaxCode()
    {
        var html = InvoiceHtmlTemplate.Render(BuildInvoice(buyerTaxCode: "0201234567"));

        html.Should().Contain("Công ty TNHH Khách Hàng A");
        html.Should().Contain("0201234567");
        html.Should().NotContain(EInvoiceBuyer.ConsumerLabel);
    }

    [Fact]
    public void Render_ShowsTotalsAndInvoiceNumber()
    {
        var invoice = BuildInvoice();

        var html = InvoiceHtmlTemplate.Render(invoice);

        html.Should().Contain("HD-2026-000123");
        html.Should().Contain($"{invoice.TotalAmount:N0} đ");
        html.Should().Contain("18/09/2026");
    }

    [Fact]
    public void Render_HtmlEncodesBuyerAndLineText_NoScriptInjection()
    {
        var invoice = BuildInvoice();
        invoice.SetBuyer("Company", "<script>alert('x')</script>", null, "020\"1234567",
            null, "<img src=x onerror=alert(1)>", null, null);

        var html = InvoiceHtmlTemplate.Render(invoice);

        html.Should().NotContain("<script>alert");
        html.Should().NotContain("<img src=x");
        html.Should().Contain("&lt;script&gt;");
    }
}
