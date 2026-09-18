using System.Text;
using Accounting.Domain;
using Accounting.Infrastructure.EInvoice;

namespace Accounting.Templates;

/// <summary>
/// Render hoá đơn dạng HTML để in/xuất PDF phía client.
///
/// Khối "người bán" đến từ <see cref="CompanyProfileOptions"/> (section <c>Company</c> của cấu hình),
/// KHÔNG còn là hằng số trong file này: bản cũ in địa chỉ "Huyện Vĩnh Bảo" — một đơn vị hành chính
/// không còn tồn tại sau sáp nhập — nên mọi bản in đều sai địa chỉ đăng ký thuế.
///
/// Cột "Giảm giá" trên từng dòng là BẮT BUỘC theo NĐ 254/2026 Đ.10.1.k (phí, lệ phí, chiết khấu
/// thương mại, khuyến mại nếu có phải thể hiện trên hoá đơn) — thay cho căn cứ cũ NĐ 123/2020
/// Đ.10.6.đ, đã hết hiệu lực từ 01/07/2026 theo NĐ 254/2026 Đ.43.2.a.
///
/// Ở chế độ mô phỏng, bản in mang dấu chìm "MÔ PHỎNG - KHÔNG CÓ GIÁ TRỊ PHÁP LÝ" để không ai
/// nhầm bản mô phỏng với hoá đơn thật.
/// </summary>
public static class InvoiceHtmlTemplate
{
    public const string SandboxWatermark = "MÔ PHỎNG - KHÔNG CÓ GIÁ TRỊ PHÁP LÝ";

    /// <param name="company">Khối người bán; để trống = giá trị mặc định đã xác minh của doanh nghiệp.</param>
    /// <param name="einvoice">Cấu hình HĐĐT; <c>Mode=Sandbox</c> ⇒ in dấu chìm mô phỏng.</param>
    public static string Render(
        Invoice invoice,
        CompanyProfileOptions? company = null,
        EInvoiceOptions? einvoice = null)
    {
        var seller = company ?? new CompanyProfileOptions();
        var isSandbox = einvoice?.IsSandbox == true
            || (invoice.EInvoiceNumber?.StartsWith("SBX-", StringComparison.Ordinal) ?? false);

        var linesHtml = BuildLinesHtml(invoice);
        var statusClass = invoice.Status == InvoiceStatus.Paid ? "paid" : "";
        var watermarkHtml = isSandbox
            ? $"<div class='watermark'>{SandboxWatermark}</div>"
            : string.Empty;

        return $@"
            <html>
            <head>
                <meta charset='utf-8' />
                <style>
                    body {{ font-family: 'Helvetica', sans-serif; max-width: 800px; margin: auto; padding: 20px; position: relative; }}
                    .header {{ display: flex; justify-content: space-between; margin-bottom: 30px; }}
                    .title {{ font-size: 40px; font-weight: bold; color: #333; }}
                    .meta {{ text-align: right; color: #666; }}
                    .buyer {{ margin-bottom: 20px; line-height: 1.6; }}
                    table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; }}
                    th {{ text-align: left; border-bottom: 2px solid #ddd; padding: 10px; }}
                    td {{ border-bottom: 1px solid #eee; padding: 10px; }}
                    .num {{ text-align: right; }}
                    .total {{ text-align: right; font-size: 20px; font-weight: bold; }}
                    .status {{ display: inline-block; padding: 5px 10px; border-radius: 5px; background: #eee; font-weight: bold; }}
                    .paid {{ background: #dff0d8; color: #3c763d; }}
                    .signature {{ margin-top: 60px; text-align: right; }}
                    .watermark {{ position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg);
                                  font-size: 46px; font-weight: bold; color: rgba(200, 0, 0, 0.22);
                                  border: 6px solid rgba(200, 0, 0, 0.22); padding: 12px 28px; letter-spacing: 2px;
                                  pointer-events: none; z-index: 1000; white-space: nowrap; }}
                </style>
            </head>
            <body>
                {watermarkHtml}
                <div class='header'>
                    <div>
                        <div class='title'>HOÁ ĐƠN</div>
                        <div>{H(seller.Name)}</div>
                        <div>{H(seller.Address)}</div>
                        <div>MST: {H(seller.TaxCode)} — ĐT: {H(seller.Phone)}</div>
                    </div>
                    <div class='meta'>
                        <div>Số: {H(invoice.InvoiceNumber)}</div>
                        <div>Ngày lập: {invoice.IssueDate:dd/MM/yyyy}</div>
                        <div>Hạn thanh toán: {invoice.DueDate:dd/MM/yyyy}</div>
                        {BuildEInvoiceMetaHtml(invoice)}
                    </div>
                </div>

                <div class='buyer'>{BuildBuyerHtml(invoice)}</div>

                <div style='margin-bottom: 20px;'>
                    <span class='status {statusClass}'>{invoice.Status}</span>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Mô tả</th>
                            <th>ĐVT</th>
                            <th class='num'>SL</th>
                            <th class='num'>Đơn giá</th>
                            <th class='num'>Giảm giá</th>
                            <th class='num'>Thuế suất</th>
                            <th class='num'>Thành tiền (chưa VAT)</th>
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
                    <div>Người bán hàng: {H(seller.Representative)}</div>
                    <div style='margin-top: 60px;'>(Ký, ghi rõ họ tên)</div>
                </div>
            </body>
            </html>
        ";
    }

    /// <summary>
    /// Mã hoá HTML cho MỌI giá trị do người dùng nhập (tên/địa chỉ người mua đến từ
    /// <c>PUT /api/accounting/einvoice/{id}/buyer</c>, mô tả dòng hàng đến từ catalog).
    /// Thiếu bước này, một tên người mua chứa thẻ script sẽ chạy trong trang in của kế toán.
    /// </summary>
    private static string H(string? text)
    {
        if (string.IsNullOrEmpty(text)) return string.Empty;

        // Chỉ thoát 5 ký tự cấu trúc: WebUtility.HtmlEncode biến mọi ký tự tiếng Việt thành
        // &#NNN; làm bản in khó đọc khi mở bằng trình soạn thảo.
        return new StringBuilder(text)
            .Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;")
            .Replace("\"", "&quot;").Replace("'", "&#39;")
            .ToString();
    }

    /// <summary>Khối người mua. Không có định danh nào ⇒ Phụ lục mục 4b NĐ 254/2026.</summary>
    private static string BuildBuyerHtml(Invoice invoice)
    {
        var buyer = new EInvoiceBuyer(
            invoice.BuyerType, invoice.BuyerLegalName, invoice.BuyerFullName, invoice.BuyerTaxCode,
            invoice.BuyerBudgetUnitCode, invoice.BuyerAddress, invoice.BuyerEmail, invoice.BuyerPhone);

        var sb = new StringBuilder();
        sb.Append($"<div>Người mua: {H(buyer.DisplayName)}</div>");
        if (!string.IsNullOrWhiteSpace(buyer.TaxCode)) sb.Append($"<div>MST người mua: {H(buyer.TaxCode)}</div>");
        if (!string.IsNullOrWhiteSpace(buyer.BudgetUnitCode))
            sb.Append($"<div>Mã ĐVQHNS: {H(buyer.BudgetUnitCode)}</div>");
        if (!string.IsNullOrWhiteSpace(buyer.Address)) sb.Append($"<div>Địa chỉ: {H(buyer.Address)}</div>");
        return sb.ToString();
    }

    /// <summary>Ký hiệu/số hoá đơn điện tử nếu đã xuất. Bản mô phỏng KHÔNG có mã tra cứu.</summary>
    private static string BuildEInvoiceMetaHtml(Invoice invoice)
    {
        if (string.IsNullOrWhiteSpace(invoice.EInvoiceNumber)) return string.Empty;

        var sb = new StringBuilder();
        if (!string.IsNullOrWhiteSpace(invoice.EInvoiceId))
            sb.Append($"<div>Ký hiệu HĐĐT: {H(invoice.EInvoiceId)}</div>");
        sb.Append($"<div>Số HĐĐT: {H(invoice.EInvoiceNumber)}</div>");
        if (!string.IsNullOrWhiteSpace(invoice.EInvoiceLookupCode))
            sb.Append($"<div>Mã tra cứu: {H(invoice.EInvoiceLookupCode)}</div>");
        return sb.ToString();
    }

    private static string BuildLinesHtml(Invoice invoice)
    {
        if (invoice.Lines.Count == 0)
        {
            return "<tr><td colspan='7'>Không có dòng hàng</td></tr>";
        }

        var sb = new StringBuilder();
        foreach (var line in invoice.Lines)
        {
            var note = line.IsPromotion ? " <em>(hàng khuyến mại không thu tiền)</em>" : string.Empty;
            sb.Append($@"<tr>
                <td>{H(line.Description)}{note}</td>
                <td>{H(line.UnitName)}</td>
                <td class='num'>{line.Quantity:N0}</td>
                <td class='num'>{line.UnitPrice:N0} đ</td>
                <td class='num'>{line.LineDiscount:N0} đ</td>
                <td class='num'>{line.VatRate:N0}%</td>
                <td class='num'>{line.NetAmount:N0} đ</td>
            </tr>");
        }
        return sb.ToString();
    }
}
