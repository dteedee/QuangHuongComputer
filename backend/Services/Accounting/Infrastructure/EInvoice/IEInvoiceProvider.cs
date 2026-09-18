namespace Accounting.Infrastructure.EInvoice;

/// <summary>
/// Hợp đồng TRUNG LẬP với nhà cung cấp HĐĐT (D07 §QUYẾT ĐỊNH.2 — interface v2).
///
/// Khai báo đủ 5 hàm để hợp đồng không bao giờ phải đổi khi adapter thật ra đời, nhưng ở đợt này
/// chỉ <see cref="SandboxEInvoiceProvider"/> hiện thực <see cref="IssueAsync"/>/<see cref="GetStatusAsync"/>;
/// điều chỉnh/thay thế/tải XML thuộc track adapter (ở chế độ External việc đó xảy ra trong phần mềm
/// của nhà cung cấp, hệ thống chỉ ghi nhận lại kết quả).
/// </summary>
public interface IEInvoiceProvider
{
    /// <summary>Mã nhà cung cấp ghi vào hoá đơn ("SANDBOX", "EXTERNAL", sau này "MISA"...).</summary>
    string ProviderCode { get; }

    /// <summary>true = kết quả KHÔNG có giá trị pháp lý.</summary>
    bool IsSandbox { get; }

    /// <summary>Phát hành. PHẢI idempotent theo <see cref="EInvoiceDocument.RefId"/> (= Invoice.Id).</summary>
    Task<EInvoiceIssueResult> IssueAsync(EInvoiceDocument document, CancellationToken ct = default);

    /// <summary>Điều chỉnh hoá đơn đã phát hành (TT 91/2026). Chưa hiện thực ở đợt này.</summary>
    Task<EInvoiceIssueResult> AdjustAsync(string originalRefId, EInvoiceDocument document, CancellationToken ct = default);

    /// <summary>Thay thế hoá đơn đã phát hành (TT 91/2026). Chưa hiện thực ở đợt này.</summary>
    Task<EInvoiceIssueResult> ReplaceAsync(string originalRefId, EInvoiceDocument document, CancellationToken ct = default);

    Task<EInvoiceStatusResult> GetStatusAsync(string refId, CancellationToken ct = default);

    Task<byte[]> DownloadAsync(string refId, EInvoiceDownloadFormat format, CancellationToken ct = default);
}

/// <summary>Phần dùng chung: các hàm chưa thuộc phạm vi đợt này ném <see cref="NotSupportedException"/>.</summary>
public abstract class EInvoiceProviderBase : IEInvoiceProvider
{
    public abstract string ProviderCode { get; }

    public abstract bool IsSandbox { get; }

    public abstract Task<EInvoiceIssueResult> IssueAsync(EInvoiceDocument document, CancellationToken ct = default);

    public abstract Task<EInvoiceStatusResult> GetStatusAsync(string refId, CancellationToken ct = default);

    public virtual Task<EInvoiceIssueResult> AdjustAsync(string originalRefId, EInvoiceDocument document, CancellationToken ct = default)
        => throw new NotSupportedException(
            $"{ProviderCode}: điều chỉnh hoá đơn chưa được hiện thực — thực hiện trên phần mềm nhà cung cấp rồi ghi nhận lại.");

    public virtual Task<EInvoiceIssueResult> ReplaceAsync(string originalRefId, EInvoiceDocument document, CancellationToken ct = default)
        => throw new NotSupportedException(
            $"{ProviderCode}: thay thế hoá đơn chưa được hiện thực — thực hiện trên phần mềm nhà cung cấp rồi ghi nhận lại.");

    public virtual Task<byte[]> DownloadAsync(string refId, EInvoiceDownloadFormat format, CancellationToken ct = default)
        => throw new NotSupportedException(
            $"{ProviderCode}: chưa có bản thể {format} để tải — bản in nội bộ dùng /api/accounting/invoices/{{id}}/print.");
}
