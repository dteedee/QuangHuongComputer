using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Reporting.Pdf;

/// <summary>
/// PDF templates for Vietnamese tax reports per Thông tư 133/2016/TT-BTC
/// Supports B01-DNN (Balance Sheet) and B02-DNN (Income Statement)
/// </summary>
public static class TaxReportPdfTemplate
{
    private const string CompanyName = "CÔNG TY TNHH QUANG HƯƠNG COMPUTER";

    public static byte[] GenerateBalanceSheetPdf(
        int year, int? quarter,
        decimal cash, decimal accountsReceivable, decimal inventory,
        decimal accountsPayable, decimal pendingExpenses, decimal equity)
    {
        var period = quarter.HasValue ? $"Quý {quarter}/{year}" : $"Năm {year}";

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginHorizontal(40);
                page.MarginVertical(30);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Element(c => RenderHeader(c,
                    "BÁO CÁO TÌNH HÌNH TÀI CHÍNH", $"B01-DNN — {period}"));

                page.Content().Column(col =>
                {
                    col.Item().PaddingVertical(8).Text("I. TÀI SẢN").Bold().FontSize(11);

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn(3);
                            c.RelativeColumn(1);
                            c.RelativeColumn(2);
                        });

                        AddTableHeader(table, new[] { "Chỉ tiêu", "Mã số", "Số tiền (VNĐ)" });
                        AddTableRow(table, "A. TÀI SẢN NGẮN HẠN", "100", PdfCurrencyHelper.FormatVnd(cash + accountsReceivable + inventory), bold: true);
                        AddTableRow(table, "  1. Tiền và các khoản tương đương tiền", "110", PdfCurrencyHelper.FormatVnd(cash));
                        AddTableRow(table, "  2. Các khoản phải thu ngắn hạn", "130", PdfCurrencyHelper.FormatVnd(accountsReceivable));
                        AddTableRow(table, "  3. Hàng tồn kho", "140", PdfCurrencyHelper.FormatVnd(inventory));
                        AddTableRow(table, "B. TÀI SẢN DÀI HẠN", "200", PdfCurrencyHelper.FormatVnd(0), bold: true);
                        AddTableRow(table, "TỔNG CỘNG TÀI SẢN", "270", PdfCurrencyHelper.FormatVnd(cash + accountsReceivable + inventory), bold: true, highlighted: true);
                    });

                    col.Item().PaddingTop(12).PaddingBottom(4).Text("II. NGUỒN VỐN").Bold().FontSize(11);

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn(3);
                            c.RelativeColumn(1);
                            c.RelativeColumn(2);
                        });

                        AddTableHeader(table, new[] { "Chỉ tiêu", "Mã số", "Số tiền (VNĐ)" });
                        AddTableRow(table, "A. NỢ PHẢI TRẢ", "300", PdfCurrencyHelper.FormatVnd(accountsPayable + pendingExpenses), bold: true);
                        AddTableRow(table, "  1. Nợ ngắn hạn — Phải trả người bán", "311", PdfCurrencyHelper.FormatVnd(accountsPayable));
                        AddTableRow(table, "  2. Chi phí phải trả", "315", PdfCurrencyHelper.FormatVnd(pendingExpenses));
                        AddTableRow(table, "B. VỐN CHỦ SỞ HỮU", "400", PdfCurrencyHelper.FormatVnd(equity), bold: true);
                        AddTableRow(table, "  Lợi nhuận sau thuế chưa phân phối", "421", PdfCurrencyHelper.FormatVnd(equity));
                        AddTableRow(table, "TỔNG CỘNG NGUỒN VỐN", "440", PdfCurrencyHelper.FormatVnd(accountsPayable + pendingExpenses + equity), bold: true, highlighted: true);
                    });

                    col.Item().Element(PdfBaseTemplate.AddSignatureBlock);
                });

                page.Footer().Element(ComposeFooter);
            });
        }).GeneratePdf();
    }

    public static byte[] GenerateIncomeStatementPdf(
        int year, int? quarter, int? month,
        decimal revenue, decimal cogs, decimal operatingExpenses,
        decimal profitBeforeTax, decimal incomeTax, decimal netProfit)
    {
        var period = month.HasValue
            ? $"Tháng {month}/{year}"
            : quarter.HasValue ? $"Quý {quarter}/{year}" : $"Năm {year}";

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginHorizontal(40);
                page.MarginVertical(30);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Element(c => RenderHeader(c,
                    "BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH", $"B02-DNN — {period}"));

                page.Content().Column(col =>
                {
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn(3);
                            c.RelativeColumn(1);
                            c.RelativeColumn(2);
                        });

                        AddTableHeader(table, new[] { "Chỉ tiêu", "Mã số", "Số tiền (VNĐ)" });
                        AddTableRow(table, "1. Doanh thu bán hàng và cung cấp DV", "01", PdfCurrencyHelper.FormatVnd(revenue));
                        AddTableRow(table, "2. Giá vốn hàng bán", "11", PdfCurrencyHelper.FormatVnd(cogs));
                        AddTableRow(table, "3. Lợi nhuận gộp (01 - 11)", "20", PdfCurrencyHelper.FormatVnd(revenue - cogs), bold: true);
                        AddTableRow(table, "4. Chi phí quản lý doanh nghiệp", "25", PdfCurrencyHelper.FormatVnd(operatingExpenses));
                        AddTableRow(table, "5. Lợi nhuận thuần từ HĐKD", "30", PdfCurrencyHelper.FormatVnd(profitBeforeTax), bold: true);
                        AddTableRow(table, "6. Lợi nhuận trước thuế", "50", PdfCurrencyHelper.FormatVnd(profitBeforeTax));
                        AddTableRow(table, "7. Thuế thu nhập doanh nghiệp (20%)", "51", PdfCurrencyHelper.FormatVnd(incomeTax));
                        AddTableRow(table, "8. LỢI NHUẬN SAU THUẾ TNDN", "60", PdfCurrencyHelper.FormatVnd(netProfit), bold: true, highlighted: true);
                    });

                    col.Item().PaddingTop(16).Text(t =>
                    {
                        t.Span("Ghi chú: ").Bold();
                        t.Span("Giá vốn hàng bán được ước tính bằng 70% doanh thu thuần theo phương pháp heuristic. Thuế suất TNDN: 20%.");
                        t.Span(" Lập theo Thông tư 133/2016/TT-BTC.").Italic().FontColor(Colors.Grey.Medium);
                    });

                    col.Item().Element(PdfBaseTemplate.AddSignatureBlock);
                });

                page.Footer().Element(ComposeFooter);
            });
        }).GeneratePdf();
    }

    private static void RenderHeader(IContainer container, string title, string subtitle)
    {
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text(CompanyName).Bold().FontSize(11);
                    c.Item().Text("TP. Hồ Chí Minh, Việt Nam").FontSize(8).FontColor(Colors.Grey.Medium);
                });
                row.ConstantItem(130).AlignRight().Column(c =>
                {
                    c.Item().Text($"Ngày lập: {DateTime.Now:dd/MM/yyyy}").FontSize(8).FontColor(Colors.Grey.Medium);
                });
            });

            col.Item().PaddingVertical(6).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
            col.Item().AlignCenter().Text(title).Bold().FontSize(15);
            col.Item().AlignCenter().Text(subtitle).FontSize(9).FontColor(Colors.Grey.Medium);
            col.Item().PaddingBottom(8);
        });
    }

    private static void AddTableHeader(TableDescriptor table, string[] headers)
    {
        foreach (var header in headers)
        {
            table.Header(h =>
            {
                h.Cell().Background(Colors.Grey.Lighten3).Padding(6)
                    .Text(header).Bold().FontSize(9);
            });
        }
    }

    private static void AddTableRow(
        TableDescriptor table, string label, string code, string amount,
        bool bold = false, bool highlighted = false)
    {
        var bg = highlighted ? Colors.Blue.Lighten4 : Colors.White;

        table.Cell().Background(bg).Padding(5)
            .Text(t => { var s = t.Span(label).FontSize(9); if (bold) s.Bold(); });
        table.Cell().Background(bg).Padding(5).AlignCenter()
            .Text(code).FontSize(9).FontColor(Colors.Grey.Darken1);
        table.Cell().Background(bg).Padding(5).AlignRight()
            .Text(t => { var s = t.Span(amount).FontSize(9); if (bold) s.Bold(); });
    }

    private static void ComposeFooter(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);
            col.Item().PaddingTop(4).Row(row =>
            {
                row.RelativeItem().Text("Xuất bởi hệ thống Quang Hương Computer").FontSize(7).FontColor(Colors.Grey.Medium);
                row.RelativeItem().AlignRight().Text(t =>
                {
                    t.Span("Trang ").FontSize(7);
                    t.CurrentPageNumber().FontSize(7);
                    t.Span(" / ").FontSize(7);
                    t.TotalPages().FontSize(7);
                });
            });
        });
    }
}
