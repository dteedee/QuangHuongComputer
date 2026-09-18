using BuildingBlocks.Endpoints;

namespace Accounting.Infrastructure.EInvoice;

/// <summary>
/// Chế độ <see cref="EInvoiceMode.External"/> (mặc định Production) và <see cref="EInvoiceMode.Off"/>:
/// hệ thống KHÔNG gọi ra ngoài. Hoá đơn thật được xuất trên phần mềm nhà cung cấp mà cửa hàng đang
/// dùng, rồi ghi nhận lại bằng <c>POST /api/accounting/einvoice/{id}/record-external</c>.
///
/// Vì vậy <see cref="IssueAsync"/> KHÔNG bịa ra một kết quả thành công: nó ném lỗi nghiệp vụ tiếng
/// Việt để giao diện chỉ đường đúng cho kế toán.
/// </summary>
public sealed class ExternalEInvoiceProvider : EInvoiceProviderBase
{
    private readonly EInvoiceOptions _options;

    public ExternalEInvoiceProvider(EInvoiceOptions options) => _options = options;

    public override string ProviderCode => _options.Mode == EInvoiceMode.Off ? "OFF" : "EXTERNAL";

    public override bool IsSandbox => false;

    public override Task<EInvoiceIssueResult> IssueAsync(EInvoiceDocument document, CancellationToken ct = default)
        => throw new DomainException(_options.Mode == EInvoiceMode.Off
            ? "Hoá đơn điện tử đang tắt (EInvoice:Mode=Off)."
            : "Hệ thống đang ở chế độ ghi nhận ngoài: hãy xuất hoá đơn trên phần mềm hoá đơn điện tử "
              + "của cửa hàng, sau đó bấm \"Ghi nhận hoá đơn đã xuất\" để lưu ký hiệu và số hoá đơn.");

    public override Task<EInvoiceStatusResult> GetStatusAsync(string refId, CancellationToken ct = default)
        => Task.FromResult(new EInvoiceStatusResult(
            refId,
            EInvoiceStatuses.NotIssued,
            IsSandbox: false,
            IssuedAt: null,
            Note: "Chế độ ghi nhận ngoài — trạng thái thật nằm trên phần mềm của nhà cung cấp."));
}
