using System.Text;
using Accounting.Domain;

namespace Accounting.Templates;

/// <summary>
/// Render hoá đơn dạng HTML để in/xuất PDF phía client.
/// Thông tin công ty khớp với dữ liệu thật đã xác minh (SystemConfigSeedDataCompany) —
/// không tham chiếu trực tiếp module SystemConfig để tránh coupling chéo module (theo ranh giới sở hữu file của phase 05).
/// </summary>
public static class InvoiceHtmlTemplate
{
    private const string CompanyName = "Công ty TNHH Máy Tính Quang Hưởng";
    private const string CompanyAddress = "Số 179 khu phố 3/2, Thị Trấn Vĩnh Bảo, Huyện Vĩnh Bảo, TP Hải Phòng";
    private const string CompanyTaxCode = "0200807633";
    private const string CompanyPhone = "0904.235.090";

    public static string Render(Invoice invoice)
    {
        var linesHtml = BuildLinesHtml(invoice);
        var statusClass = invoice.Status == InvoiceStatus.Paid ? "paid" : "";

        return $@"
            <html>
            <head>
                <meta charset='utf-8' />
                <style>
                    body {{ font-family: 'Helvetica', sans-serif; max-width: 800px; margin: auto; padding: 20px; }}
                    .header {{ display: flex; justify-content: space-between; margin-bottom: 50px; }}
                    .title {{ font-size: 40px; font-weight: bold; color: #333; }}
                    .meta {{ text-align: right; color: #666; }}
                    table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; }}
                    th {{ text-align: left; border-bottom: 2px solid #ddd; padding: 10px; }}
                    td {{ border-bottom: 1px solid #eee; padding: 10px; }}
                    .total {{ text-align: right; font-size: 20px; font-weight: bold; }}
                    .status {{ display: inline-block; padding: 5px 10px; border-radius: 5px; background: #eee; font-weight: bold; }}
                    .paid {{ background: #dff0d8; color: #3c763d; }}
                    .signature {{ margin-top: 60px; text-align: right; }}
                </style>
            </head>
            <body>
                <div class='header'>
                    <div>
                        <div class='title'>HOÁ ĐƠN</div>
                        <div>{CompanyName}</div>
                        <div>{CompanyAddress}</div>
                        <div>MST: {CompanyTaxCode} — ĐT: {CompanyPhone}</div>
                    </div>
                    <div class='meta'>
                        <div>Số: {invoice.InvoiceNumber}</div>
                        <div>Ngày lập: {invoice.IssueDate:dd/MM/yyyy}</div>
                        <div>Hạn thanh toán: {invoice.DueDate:dd/MM/yyyy}</div>
                    </div>
                </div>

                <div style='margin-bottom: 20px;'>
                    <span class='status {statusClass}'>{invoice.Status}</span>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Mô tả</th>
                            <th>SL</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {linesHtml}
                    </tbody>
                </table>

                <div class='total'>
                    <div>Tạm tính: {invoice.SubTotal:N0} đ</div>
                    <div>Thuế GTGT: {invoice.VatAmount:N0} đ</div>
                    <div style='font-size: 24px; margin-top: 10px;'>Tổng cộng: {invoice.TotalAmount:N0} đ</div>
                </div>

                <div class='signature'>
                    <div>Người lập hoá đơn</div>
                    <div style='margin-top: 60px;'>(Ký, ghi rõ họ tên)</div>
                </div>
            </body>
            </html>
        ";
    }

    private static string BuildLinesHtml(Invoice invoice)
    {
        if (invoice.Lines.Count == 0)
        {
            return "<tr><td colspan='4'>Không có dòng hàng</td></tr>";
        }

        var sb = new StringBuilder();
        foreach (var line in invoice.Lines)
        {
            sb.Append($@"<tr>
                <td>{line.Description}</td>
                <td>{line.Quantity:N0}</td>
                <td>{line.UnitPrice:N0} đ</td>
                <td>{line.LineTotal:N0} đ</td>
            </tr>");
        }
        return sb.ToString();
    }
}
