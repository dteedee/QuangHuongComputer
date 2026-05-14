using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Reporting.Pdf;

public class PdfBaseTemplate : IDocument
{
    private readonly string _title;
    private readonly string _period;
    private readonly Action<IContainer> _contentBuilder;
    private const string CompanyName = "CÔNG TY TNHH QUANG HƯƠNG COMPUTER";
    private const string CompanyAddress = "TP. Hồ Chí Minh, Việt Nam";

    public PdfBaseTemplate(string title, string period, Action<IContainer> contentBuilder)
    {
        _title = title;
        _period = period;
        _contentBuilder = contentBuilder;
    }

    public DocumentMetadata GetMetadata() => new() { Title = _title, Author = CompanyName };

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.MarginHorizontal(40);
            page.MarginVertical(30);
            page.DefaultTextStyle(x => x.FontSize(10));

            page.Header().Element(ComposeHeader);
            page.Content().Element(c => _contentBuilder(c));
            page.Footer().Element(ComposeFooter);
        });
    }

    private void ComposeHeader(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text(CompanyName).Bold().FontSize(12);
                    c.Item().Text(CompanyAddress).FontSize(8).FontColor(Colors.Grey.Medium);
                });
                row.ConstantItem(120).AlignRight().Column(c =>
                {
                    c.Item().Text(DateTime.Now.ToString("dd/MM/yyyy")).FontSize(8).FontColor(Colors.Grey.Medium);
                });
            });

            col.Item().PaddingVertical(8).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

            col.Item().AlignCenter().Text(_title).Bold().FontSize(16);
            if (!string.IsNullOrEmpty(_period))
                col.Item().AlignCenter().Text(_period).FontSize(9).FontColor(Colors.Grey.Medium);

            col.Item().PaddingBottom(10);
        });
    }

    private void ComposeFooter(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);
            col.Item().PaddingTop(5).Row(row =>
            {
                row.RelativeItem().Text(t =>
                {
                    t.Span("Xuất bởi hệ thống Quang Hương Computer").FontSize(7).FontColor(Colors.Grey.Medium);
                });
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

    public static void AddSignatureBlock(IContainer container)
    {
        container.PaddingTop(30).Row(row =>
        {
            row.RelativeItem().AlignCenter().Column(c =>
            {
                c.Item().Text("Người lập").Bold().FontSize(9);
                c.Item().PaddingTop(40).Text("(Ký, ghi rõ họ tên)").FontSize(8).Italic().FontColor(Colors.Grey.Medium);
            });
            row.RelativeItem().AlignCenter().Column(c =>
            {
                c.Item().Text("Kế toán trưởng").Bold().FontSize(9);
                c.Item().PaddingTop(40).Text("(Ký, ghi rõ họ tên)").FontSize(8).Italic().FontColor(Colors.Grey.Medium);
            });
            row.RelativeItem().AlignCenter().Column(c =>
            {
                c.Item().Text("Giám đốc").Bold().FontSize(9);
                c.Item().PaddingTop(40).Text("(Ký, đóng dấu, ghi rõ họ tên)").FontSize(8).Italic().FontColor(Colors.Grey.Medium);
            });
        });
    }

    public byte[] GeneratePdf()
    {
        return Document.Create(Compose).GeneratePdf();
    }
}
