using Accounting.Infrastructure.EInvoice;

namespace Accounting.Application.EInvoice;

/// <summary>Trạng thái chế độ HĐĐT cho badge trên giao diện quản trị (D07 §Rủi ro: badge đỏ SANDBOX).</summary>
public sealed record EInvoiceModeDto(
    string Mode,
    string Provider,
    bool IsSandbox,
    string Kind,
    string IssueTrigger,
    string Series,
    int QueueWarningDays,
    string Notice);

/// <summary>Một dòng trong hàng đợi "Chờ xuất HĐĐT".</summary>
public sealed record EInvoiceQueueItemDto(
    Guid InvoiceId,
    string InvoiceNumber,
    Guid? OrderId,
    string? OrderNumber,
    DateTime IssueDate,
    decimal TotalAmount,
    decimal TotalNet,
    decimal TotalVat,
    string BuyerName,
    string? BuyerTaxCode,
    string? BuyerAddress,
    bool IsConsumer,
    string EInvoiceStatus,
    int AgeDays,
    bool IsLate);

/// <summary>Kết quả phát hành/ghi nhận trả về cho giao diện.</summary>
public sealed record EInvoiceResultDto(
    Guid InvoiceId,
    string InvoiceNumber,
    string Status,
    string Provider,
    bool IsSandbox,
    string? Series,
    string? Number,
    string? LookupCode,
    DateTime? IssuedAt,
    string? Notice);

/// <summary>Ghi nhận hoá đơn ĐÃ XUẤT trên phần mềm của nhà cung cấp.</summary>
public sealed record RecordExternalEInvoiceRequest(
    string Series,
    string Number,
    string? LookupCode,
    DateTime? IssuedAt);

/// <summary>Bổ sung thông tin người mua sau khi đặt hàng — chỉ mở khi hoá đơn CHƯA xuất HĐĐT.</summary>
public sealed record UpdateEInvoiceBuyerRequest(
    string? BuyerType,
    string? LegalName,
    string? FullName,
    string? TaxCode,
    string? BudgetUnitCode,
    string? Address,
    string? Email,
    string? Phone);

public static class EInvoiceNotices
{
    public const string Sandbox =
        "MÔ PHỎNG — KHÔNG CÓ GIÁ TRỊ PHÁP LÝ. Số hoá đơn mô phỏng không tra cứu được tại cơ quan thuế.";

    public const string External =
        "Chế độ ghi nhận ngoài: hệ thống lập hoá đơn nội bộ và xếp hàng chờ; "
        + "hoá đơn điện tử thật được xuất trên phần mềm của nhà cung cấp rồi ghi nhận lại tại đây.";

    public const string Off =
        "Hoá đơn điện tử đang TẮT (EInvoice:Mode=Off) — hệ thống không lập hàng đợi HĐĐT.";

    public static string For(EInvoiceMode mode) => mode switch
    {
        EInvoiceMode.Sandbox => Sandbox,
        EInvoiceMode.Off => Off,
        EInvoiceMode.Live => "Chế độ Live: hoá đơn được phát hành trực tiếp qua nhà cung cấp.",
        _ => External
    };
}
