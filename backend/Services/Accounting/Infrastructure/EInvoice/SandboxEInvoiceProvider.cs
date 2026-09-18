using BuildingBlocks.Time;

namespace Accounting.Infrastructure.EInvoice;

/// <summary>
/// Nhà cung cấp MÔ PHỎNG (đổi tên từ <c>MockEInvoiceProvider</c>, D07 §QUYẾT ĐỊNH.1).
///
/// Mọi tín hiệu "giống thật" đã bị bóc sạch: KHÔNG trả trạng thái đã ký của cơ quan thuế,
/// KHÔNG mã cơ quan thuế, KHÔNG link tra cứu của Tổng cục Thuế, KHÔNG gửi email cho khách.
/// Số hoá đơn luôn mang tiền tố cấu hình (<c>SBX-</c>) và ký hiệu là <see cref="SandboxSeries"/>
/// — một chuỗi không thể nhầm với ký hiệu do cơ quan thuế cấp. Có thưởng tố giác hành vi
/// gian lận hoá đơn, nên "nhìn giống thật" là rủi ro chứ không phải tiện ích.
///
/// Idempotent: số hoá đơn được sinh TẤT ĐỊNH từ <see cref="EInvoiceDocument.RefId"/>, nên phát
/// hành lại cùng một hoá đơn luôn cho đúng một kết quả.
/// </summary>
public sealed class SandboxEInvoiceProvider : EInvoiceProviderBase
{
    public const string SandboxSeries = "SBX-MOPHONG";

    private readonly EInvoiceOptions _options;
    private readonly IBusinessClock _clock;

    public SandboxEInvoiceProvider(EInvoiceOptions options, IBusinessClock clock)
    {
        _options = options;
        _clock = clock;
    }

    public override string ProviderCode => "SANDBOX";

    public override bool IsSandbox => true;

    public override Task<EInvoiceIssueResult> IssueAsync(EInvoiceDocument document, CancellationToken ct = default)
    {
        var number = BuildNumber(document.RefId);

        return Task.FromResult(new EInvoiceIssueResult(
            Success: true,
            RefId: document.RefId.ToString(),
            ProviderInvoiceId: $"{_options.SandboxPrefix}{document.RefId:N}",
            Series: SandboxSeries,
            Number: number,
            LookupCode: null,          // không bao giờ có mã tra cứu mô phỏng
            TaxAuthorityCode: null,    // không bao giờ có mã cơ quan thuế mô phỏng
            IssuedAt: _clock.UtcNow.UtcDateTime,
            IsSandbox: true,
            Error: null));
    }

    public override Task<EInvoiceStatusResult> GetStatusAsync(string refId, CancellationToken ct = default)
        => Task.FromResult(new EInvoiceStatusResult(
            refId,
            EInvoiceStatuses.Issued,
            IsSandbox: true,
            IssuedAt: null,
            Note: "Dữ liệu mô phỏng — không có giá trị pháp lý, không tra cứu được ở cơ quan thuế."));

    /// <summary>
    /// <c>SBX-</c> + 8 chữ số tất định từ RefId. Không dùng ngày/tháng để không gợi dạng số
    /// hoá đơn thật (<c>yyMM#####</c>) mà bản Mock cũ bắt chước.
    /// </summary>
    private string BuildNumber(Guid refId)
    {
        var bytes = refId.ToByteArray();
        uint acc = 2166136261;
        foreach (var b in bytes)
        {
            acc = (acc ^ b) * 16777619;
        }

        return $"{_options.SandboxPrefix}{acc % 100_000_000:D8}";
    }
}
