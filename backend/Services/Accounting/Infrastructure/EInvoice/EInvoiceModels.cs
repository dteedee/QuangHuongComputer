namespace Accounting.Infrastructure.EInvoice;

/// <summary>
/// Giá trị của cột text <c>Invoices.EInvoiceStatus</c> (D07 §6 — enum NotIssued | Pending | Issued |
/// Failed | Adjusted | Replaced | ExternalRecorded). Cột vẫn là text vì migration thuộc W2-14;
/// mọi nơi ghi/đọc đều đi qua các hằng số dưới đây để không bao giờ có chuỗi tự do.
/// </summary>
public static class EInvoiceStatuses
{
    public const string NotIssued = "NotIssued";
    public const string Pending = "Pending";
    public const string Issued = "Issued";
    public const string Failed = "Failed";
    public const string Adjusted = "Adjusted";
    public const string Replaced = "Replaced";

    /// <summary>Hoá đơn thật đã xuất trên phần mềm nhà cung cấp và được ghi nhận lại vào hệ thống.</summary>
    public const string ExternalRecorded = "ExternalRecorded";

    /// <summary>Các trạng thái coi như ĐÃ XONG — không còn nằm trong hàng đợi chờ xuất HĐĐT.</summary>
    public static readonly string[] Settled =
    {
        Issued, ExternalRecorded, Adjusted, Replaced
    };

    public static bool IsSettled(string? status)
        => status != null && Array.IndexOf(Settled, status) >= 0;
}

/// <summary>Khối thông tin người mua trên hoá đơn (NĐ 254/2026 Đ.10.1.d + Phụ lục mục 4b).</summary>
public sealed record EInvoiceBuyer(
    string? BuyerType,
    string? LegalName,
    string? FullName,
    string? TaxCode,
    string? BudgetUnitCode,
    string? Address,
    string? Email,
    string? Phone)
{
    /// <summary>Không có bất kỳ định danh nào -> Phụ lục mục 4b: ghi "Bán cho người tiêu dùng".</summary>
    public bool IsConsumer =>
        string.IsNullOrWhiteSpace(TaxCode) && string.IsNullOrWhiteSpace(BudgetUnitCode);

    public string DisplayName =>
        !string.IsNullOrWhiteSpace(LegalName) ? LegalName!
        : !string.IsNullOrWhiteSpace(FullName) ? FullName!
        : ConsumerLabel;

    public const string ConsumerLabel = "Bán cho người tiêu dùng";

    public static readonly EInvoiceBuyer Consumer =
        new(null, null, null, null, null, null, null, null);
}

/// <summary>
/// Một dòng hàng trên chứng từ gửi nhà cung cấp. Cột giảm giá từng dòng là yêu cầu của kế toán
/// và của mẫu hoá đơn (xem <c>docs/api-contracts/accounting-einvoice.md</c> §Căn cứ pháp lý).
/// </summary>
public sealed record EInvoiceDocumentLine(
    string Name,
    string? Sku,
    string UnitName,
    decimal Quantity,
    decimal UnitPrice,
    decimal VatRate,
    decimal DiscountAmount,
    decimal NetAmount,
    decimal VatAmount,
    decimal GrossAmount,
    bool IsPromotion);

/// <summary>
/// Chứng từ trung lập gửi cho bất kỳ nhà cung cấp HĐĐT nào. <see cref="RefId"/> = <c>Invoice.Id</c>
/// và là khoá chống trùng: phát hành lại cùng RefId phải trả về đúng hoá đơn cũ.
/// </summary>
public sealed record EInvoiceDocument(
    Guid RefId,
    string InternalInvoiceNumber,
    DateTime IssueDate,
    EInvoiceKind Kind,
    EInvoiceBuyer Buyer,
    string PaymentMethodName,
    IReadOnlyList<EInvoiceDocumentLine> Lines,
    decimal TotalNet,
    decimal TotalVat,
    decimal TotalAmount,
    string Currency = "VND");

/// <summary>Kết quả phát hành. Không có trường mã cơ quan thuế ở Sandbox — xem <see cref="SandboxEInvoiceProvider"/>.</summary>
public sealed record EInvoiceIssueResult(
    bool Success,
    string RefId,
    string ProviderInvoiceId,
    string Series,
    string Number,
    string? LookupCode,
    string? TaxAuthorityCode,
    DateTime IssuedAt,
    bool IsSandbox,
    string? Error)
{
    public static EInvoiceIssueResult Fail(Guid refId, string error) =>
        new(false, refId.ToString(), string.Empty, string.Empty, string.Empty,
            null, null, default, false, error);
}

/// <summary>Trạng thái đọc từ nhà cung cấp.</summary>
public sealed record EInvoiceStatusResult(
    string RefId,
    string Status,
    bool IsSandbox,
    DateTime? IssuedAt,
    string? Note);
