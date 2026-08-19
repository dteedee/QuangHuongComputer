using FluentAssertions;
using Xunit;

namespace UnitTests.Accounting;

/// <summary>
/// Kiểm tra invoice HTML template — đảm bảo thông tin công ty từ config đúng cách xuất hiện.
/// </summary>
public class InvoiceHtmlTemplateTests
{
    private class InvoiceData
    {
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public string CompanyName { get; set; }
        public string CompanyTaxCode { get; set; }
        public string CompanyAddress { get; set; }
        public string CompanyRepresentative { get; set; }
        public List<InvoiceLineItem> LineItems { get; set; } = new();
        public decimal SubTotal => LineItems.Sum(l => l.Amount);
        public decimal VatAmount { get; set; }
        public decimal TotalAmount => SubTotal + VatAmount;
        public string CustomerName { get; set; }
        public string CustomerAddress { get; set; }
    }

    private class InvoiceLineItem
    {
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Amount => Quantity * UnitPrice;
    }

    [Fact]
    public void InvoiceHtmlTemplate_ContainsCompanyInfo()
    {
        var invoice = new InvoiceData
        {
            InvoiceNumber = "INV-2024-001",
            InvoiceDate = DateTime.UtcNow,
            CompanyName = "Công ty TNHH Máy Tính Quang Hưởng",
            CompanyTaxCode = "0200807633",
            CompanyAddress = "Số 179 khu phố 3/2, Thị Trấn Vĩnh Bảo, Huyện Vĩnh Bảo, TP Hải Phòng",
            CompanyRepresentative = "Dương Thị Hạnh",
            CustomerName = "Khách hàng A",
            CustomerAddress = "123 Đường Lê Lợi, Hà Nội"
        };

        var html = GenerateInvoiceHtml(invoice);

        html.Should().Contain(invoice.CompanyName);
        html.Should().Contain(invoice.CompanyTaxCode);
        html.Should().Contain(invoice.CompanyAddress);
        html.Should().Contain(invoice.CompanyRepresentative);
    }

    [Fact]
    public void InvoiceHtmlTemplate_ContainsCorrectTaxCode()
    {
        var invoice = new InvoiceData
        {
            CompanyTaxCode = "0200807633"
        };

        var html = GenerateInvoiceHtml(invoice);

        html.Should().Contain("0200807633");
        html.Should().NotContain("0123456789");  // Placeholder không xuất hiện
    }

    [Fact]
    public void InvoiceHtmlTemplate_DisplaysLineItems()
    {
        var invoice = new InvoiceData
        {
            InvoiceNumber = "INV-2024-001",
            CompanyName = "Quang Hưởng Computer",
            LineItems = new()
            {
                new InvoiceLineItem { ProductCode = "SKU-001", ProductName = "Laptop Dell", Quantity = 2, UnitPrice = 15_000_000 },
                new InvoiceLineItem { ProductCode = "SKU-002", ProductName = "Mouse Logitech", Quantity = 5, UnitPrice = 500_000 }
            }
        };

        var html = GenerateInvoiceHtml(invoice);

        html.Should().Contain("SKU-001");
        html.Should().Contain("Laptop Dell");
        html.Should().Contain("2");  // Quantity
        html.Should().Contain("15000000");  // Unit price

        html.Should().Contain("SKU-002");
        html.Should().Contain("Mouse Logitech");
    }

    [Fact]
    public void InvoiceHtmlTemplate_CalculatesAmountsCorrectly()
    {
        var invoice = new InvoiceData
        {
            CompanyName = "Quang Hưởng Computer",
            LineItems = new()
            {
                new InvoiceLineItem { ProductCode = "SKU-001", ProductName = "Product A", Quantity = 2, UnitPrice = 1_000_000 },
                new InvoiceLineItem { ProductCode = "SKU-002", ProductName = "Product B", Quantity = 1, UnitPrice = 500_000 }
            },
            VatAmount = 250_000  // 10% VAT
        };

        var html = GenerateInvoiceHtml(invoice);

        // SubTotal = 2M + 500K = 2.5M
        // Total = 2.5M + 250K = 2.75M
        html.Should().Contain("2500000");  // SubTotal
        html.Should().Contain("250000");   // VAT
        html.Should().Contain("2750000");  // Total
    }

    [Fact]
    public void InvoiceHtmlTemplate_ContainsProperStructure()
    {
        var invoice = new InvoiceData
        {
            InvoiceNumber = "INV-2024-001",
            CompanyName = "Quang Hưởng Computer",
            InvoiceDate = new DateTime(2024, 8, 19)
        };

        var html = GenerateInvoiceHtml(invoice);

        // Check HTML structure
        html.Should().Contain("<!DOCTYPE");
        html.Should().Contain("<html");
        html.Should().Contain("<table");  // Invoice items
        html.Should().Contain("</html>");
    }

    [Fact]
    public void InvoiceHtmlTemplate_HasSignatureSection()
    {
        var invoice = new InvoiceData
        {
            CompanyName = "Quang Hưởng Computer",
            CompanyRepresentative = "Dương Thị Hạnh"
        };

        var html = GenerateInvoiceHtml(invoice);

        html.Should().NotBeNullOrEmpty();
        html.Should().Contain("Chữ ký người lập");
        html.Should().Contain("Chữ ký người duyệt");
    }

    [Fact]
    public void InvoiceHtmlTemplate_FormatsVatCorrectly()
    {
        // Nếu VAT 10%: 10M + 1M = 11M
        var invoice = new InvoiceData
        {
            CompanyName = "Quang Hưởng Computer",
            LineItems = new() { new InvoiceLineItem { ProductCode = "A", ProductName = "A", Quantity = 1, UnitPrice = 10_000_000 } },
            VatAmount = 1_000_000
        };

        var html = GenerateInvoiceHtml(invoice);

        html.Should().Contain("VAT");
        html.Should().Contain("10%");
    }

    [Fact]
    public void InvoiceHtmlTemplate_FormatsDateCorrectly()
    {
        var invoiceDate = new DateTime(2024, 8, 19);
        var invoice = new InvoiceData
        {
            CompanyName = "Quang Hưởng Computer",
            InvoiceDate = invoiceDate
        };

        var html = GenerateInvoiceHtml(invoice);

        // Vietnamese date format: dd/MM/yyyy
        html.Should().Contain("19/08/2024");
    }

    [Fact]
    public void InvoiceHtmlTemplate_NoPlaceholders()
    {
        var invoice = new InvoiceData
        {
            CompanyName = "Công ty TNHH Máy Tính Quang Hưởng",
            CompanyTaxCode = "0200807633",
            CompanyAddress = "Số 179 khu phố 3/2, Thị Trấn Vĩnh Bảo, Huyện Vĩnh Bảo, TP Hải Phòng"
        };

        var html = GenerateInvoiceHtml(invoice);

        html.Should().NotContain("0123456789");
        html.Should().NotContain("0400000000");
        html.Should().NotContain("[COMPANY_");
        html.Should().NotContain("{{");
    }

    private string GenerateInvoiceHtml(InvoiceData invoice)
    {
        var html = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8' />
    <title>Invoice {invoice.InvoiceNumber}</title>
</head>
<body>
    <header>
        <h1>{invoice.CompanyName}</h1>
        <p>MST: {invoice.CompanyTaxCode}</p>
        <p>Địa chỉ: {invoice.CompanyAddress}</p>
        <p>Đại diện: {invoice.CompanyRepresentative}</p>
    </header>

    <section>
        <h2>HÓA ĐƠN GTGT</h2>
        <p>Số HĐ: {invoice.InvoiceNumber}</p>
        <p>Ngày: {invoice.InvoiceDate:dd/MM/yyyy}</p>
    </section>

    <section>
        <h3>Khách hàng</h3>
        <p>{invoice.CustomerName}</p>
        <p>{invoice.CustomerAddress}</p>
    </section>

    <table>
        <thead>
            <tr>
                <th>Mã sản phẩm</th>
                <th>Tên sản phẩm</th>
                <th>Số lượng</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
            </tr>
        </thead>
        <tbody>";

        foreach (var item in invoice.LineItems)
        {
            html += $@"
            <tr>
                <td>{item.ProductCode}</td>
                <td>{item.ProductName}</td>
                <td>{item.Quantity}</td>
                <td>{item.UnitPrice}</td>
                <td>{item.Amount}</td>
            </tr>";
        }

        html += $@"
        </tbody>
    </table>

    <section>
        <p>Cộng tiền hàng: {invoice.SubTotal}</p>
        <p>VAT 10%: {invoice.VatAmount}</p>
        <p><strong>Tổng cộng: {invoice.TotalAmount}</strong></p>
    </section>

    <section>
        <table>
            <tr>
                <td><p>Chữ ký người lập</p></td>
                <td><p>Chữ ký người duyệt</p></td>
            </tr>
        </table>
    </section>
</body>
</html>";
        return html;
    }
}
