using System.Text.RegularExpressions;

namespace Sales.Domain;

/// <summary>
/// D07 — khối thông tin NGƯỜI MUA dùng để xuất hoá đơn điện tử. Sở hữu bởi <see cref="Order"/>
/// (owned entity, cùng bảng <c>Orders</c>) nên hoá đơn không bao giờ phải đọc ngược sang Identity/CRM.
///
/// CỐ Ý KHÔNG CÓ số CCCD/CMND của người mua: NĐ 70/2025 không bắt buộc với hoá đơn bán lẻ, và lưu
/// định danh cá nhân làm phát sinh nghĩa vụ bảo vệ dữ liệu cá nhân không tương xứng với lợi ích.
/// </summary>
public class BuyerInvoiceInfo
{
    /// <summary>MST doanh nghiệp 10 số, chi nhánh 10-3 số, hoặc MST cá nhân 12 số.</summary>
    public const string TaxCodePattern = @"^\d{10}(-\d{3})?$|^\d{12}$";

    /// <summary>Khách có tick "Xuất hoá đơn công ty" hay không. false → chỉ xuất hoá đơn bán lẻ.</summary>
    public bool InvoiceRequested { get; private set; }

    public BuyerType BuyerType { get; private set; } = BuyerType.Individual;

    /// <summary>Tên pháp nhân (tổ chức). Bắt buộc khi <see cref="BuyerType"/> = Organization.</summary>
    public string? BuyerLegalName { get; private set; }

    /// <summary>Họ tên người mua (cá nhân) hoặc người liên hệ của tổ chức.</summary>
    public string? BuyerFullName { get; private set; }

    public string? BuyerTaxCode { get; private set; }

    /// <summary>Mã đơn vị quan hệ ngân sách — dùng thay MST cho đơn vị sự nghiệp công lập.</summary>
    public string? BuyerBudgetUnitCode { get; private set; }

    public string? BuyerAddress { get; private set; }
    public string? BuyerEmail { get; private set; }
    public string? BuyerPhone { get; private set; }

    public BuyerInvoiceInfo() { }

    /// <summary>
    /// Dựng khối người mua đã validate. Ném <see cref="ArgumentException"/> khi tổ chức thiếu
    /// tên pháp nhân, hoặc thiếu CẢ MST lẫn mã đơn vị ngân sách, hoặc MST sai định dạng.
    /// </summary>
    public static BuyerInvoiceInfo ForInvoice(
        BuyerType buyerType,
        string? legalName,
        string? fullName,
        string? taxCode,
        string? budgetUnitCode,
        string? address,
        string? email,
        string? phone)
    {
        taxCode = Normalize(taxCode);
        budgetUnitCode = Normalize(budgetUnitCode);

        if (buyerType == BuyerType.Organization)
        {
            if (string.IsNullOrWhiteSpace(legalName))
                throw new ArgumentException("Tên đơn vị là bắt buộc khi xuất hoá đơn công ty", nameof(legalName));
            if (string.IsNullOrWhiteSpace(taxCode) && string.IsNullOrWhiteSpace(budgetUnitCode))
                throw new ArgumentException("Phải có mã số thuế hoặc mã đơn vị quan hệ ngân sách", nameof(taxCode));
        }

        if (!string.IsNullOrWhiteSpace(taxCode) && !Regex.IsMatch(taxCode, TaxCodePattern))
            throw new ArgumentException("Mã số thuế không đúng định dạng (10 số, 10-3 số hoặc 12 số)", nameof(taxCode));

        return new BuyerInvoiceInfo
        {
            InvoiceRequested = true,
            BuyerType = buyerType,
            BuyerLegalName = Normalize(legalName),
            BuyerFullName = Normalize(fullName),
            BuyerTaxCode = taxCode,
            BuyerBudgetUnitCode = budgetUnitCode,
            BuyerAddress = Normalize(address),
            BuyerEmail = Normalize(email),
            BuyerPhone = Normalize(phone),
        };
    }

    /// <summary>Khách không yêu cầu hoá đơn công ty — vẫn giữ tên/điện thoại cho hoá đơn bán lẻ.</summary>
    public static BuyerInvoiceInfo None(string? fullName = null, string? email = null, string? phone = null) => new()
    {
        InvoiceRequested = false,
        BuyerType = BuyerType.Individual,
        BuyerFullName = Normalize(fullName),
        BuyerEmail = Normalize(email),
        BuyerPhone = Normalize(phone),
    };

    private static string? Normalize(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

/// <summary>D07 — loại người mua trên hoá đơn.</summary>
public enum BuyerType
{
    Individual = 0,
    Organization = 1,
    BudgetUnit = 2,
}
