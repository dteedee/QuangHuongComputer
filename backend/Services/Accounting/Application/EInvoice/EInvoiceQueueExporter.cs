using BuildingBlocks.Spreadsheet;
using ClosedXML.Excel;

namespace Accounting.Application.EInvoice;

/// <summary>
/// Xuất hàng đợi "Chờ xuất HĐĐT" ra Excel để kế toán nhập hàng loạt vào phần mềm HĐĐT.
///
/// Bộ cột ở đây là bộ cột TRUNG LẬP (đúng các trường mà mọi mẫu nhập liệu HĐĐT đều cần), KHÔNG
/// phải mẫu nhập của một nhà cung cấp cụ thể: chưa ai có mẫu thật của cửa hàng. Bịa ra một mẫu
/// "giống MISA" chỉ khiến kế toán vẫn phải gõ tay mà lại tưởng là nhập được. Khi chủ shop cung cấp
/// mẫu thật (đợt 3), ánh xạ cột được bổ sung ở đây.
/// </summary>
public static class EInvoiceQueueExporter
{
    public const string ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private static readonly string[] Headers =
    {
        "Số hoá đơn nội bộ", "Mã đơn hàng", "Ngày lập", "Tên người mua", "Mã số thuế",
        "Địa chỉ", "Tiền hàng chưa thuế", "Tiền thuế GTGT", "Tổng thanh toán",
        "Số ngày chờ", "Trạng thái HĐĐT"
    };

    public static byte[] Build(IReadOnlyList<EInvoiceQueueItemDto> items)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.AddWorksheet("ChoXuatHDDT");

        for (var c = 0; c < Headers.Length; c++)
        {
            sheet.Cell(1, c + 1).Value = Headers[c];
            sheet.Cell(1, c + 1).Style.Font.Bold = true;
        }

        var row = 2;
        foreach (var item in items)
        {
            sheet.Cell(row, 1).Value = Safe(item.InvoiceNumber);
            sheet.Cell(row, 2).Value = Safe(item.OrderNumber);
            sheet.Cell(row, 3).Value = item.IssueDate;
            sheet.Cell(row, 3).Style.DateFormat.Format = "dd/MM/yyyy";
            sheet.Cell(row, 4).Value = Safe(item.BuyerName);
            sheet.Cell(row, 5).Value = Safe(item.BuyerTaxCode);
            sheet.Cell(row, 6).Value = Safe(item.BuyerAddress);
            sheet.Cell(row, 7).Value = item.TotalNet;
            sheet.Cell(row, 8).Value = item.TotalVat;
            sheet.Cell(row, 9).Value = item.TotalAmount;
            sheet.Cell(row, 10).Value = item.AgeDays;
            sheet.Cell(row, 11).Value = item.EInvoiceStatus;
            row++;
        }

        sheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    /// <summary>Chống công thức lạ khi mở file trong Excel (=, +, -, @ đầu ô).</summary>
    private static string Safe(string? text) => ExcelSafeText.Neutralize(text) ?? string.Empty;
}
