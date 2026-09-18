namespace Accounting.Infrastructure.EInvoice;

/// <summary>
/// Khối "người bán" in trên hoá đơn. Trước đây là 4 hằng số nằm trong
/// <c>Templates/InvoiceHtmlTemplate.cs</c> — trong đó có một địa chỉ ghi đơn vị hành chính
/// ("Huyện Vĩnh Bảo") đã không còn tồn tại sau sáp nhập.
///
/// Giá trị đến từ section <c>Company</c> của cấu hình (appsettings / biến môi trường). Giá trị mặc
/// định dưới đây là dữ liệu ĐÃ XÁC MINH của doanh nghiệp theo <c>decisions/D09</c> (cùng nguồn với
/// <c>SystemConfigSeedDataCompany</c>) — module Accounting không tham chiếu module SystemConfig để
/// giữ ranh giới module, nên khi chủ shop đổi thông tin thì đổi ở cấu hình host, một chỗ duy nhất.
/// </summary>
public sealed class CompanyProfileOptions
{
    public const string SectionName = "Company";

    public string Name { get; set; } = "Công ty TNHH Máy Tính Quang Hưởng";

    /// <summary>Địa chỉ ĐĂNG KÝ THUẾ — đây mới là địa chỉ được in lên hoá đơn (COMPANY_TAX_ADDRESS).</summary>
    public string Address { get; set; } = "Số 179 Khu phố 13/2 - TT Vĩnh Bảo, Xã Vĩnh Bảo, TP Hải Phòng";

    public string TaxCode { get; set; } = "0200807633";

    public string Phone { get; set; } = "0225 3823769";

    public string Email { get; set; } = "quanghuongvbhp@gmail.com";

    /// <summary>Người đại diện pháp luật — ký "Người bán hàng" trên bản in.</summary>
    public string Representative { get; set; } = "Dương Thị Hạnh";
}
