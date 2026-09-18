using Accounting.Domain;
using Accounting.Infrastructure;
using Accounting.Infrastructure.EInvoice;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Accounting.Application.EInvoice;

/// <summary>
/// Nghiệp vụ hoá đơn điện tử: hàng đợi "Chờ xuất HĐĐT", phát hành có KIỂM TRA TRẠNG THÁI,
/// và ghi nhận hoá đơn đã xuất trên phần mềm của nhà cung cấp (D07).
///
/// LƯU TRỮ TẠM THỜI (ghi rõ để không ai đoán sai): bảng <c>Invoices</c> mới chỉ có 5 cột HĐĐT
/// (<c>EInvoiceId, EInvoiceNumber, EInvoiceLookupCode, EInvoiceStatus, EInvoiceIssuedAt</c>).
/// Các cột riêng của D07 (<c>EInvoiceSeries/Provider/Mode/Kind/TaxAuthorityCode/Error/RefId</c>)
/// thuộc migration của W2-14 và CHƯA có, nên tạm ánh xạ:
///   <c>EInvoiceId</c> = KÝ HIỆU hoá đơn (ký hiệu là định danh phía nhà cung cấp, không mất dữ liệu),
///   <c>EInvoiceNumber</c> = SỐ hoá đơn, <c>EInvoiceLookupCode</c> = mã tra cứu.
/// Xem integration request W2-24 #1.
/// </summary>
public class EInvoiceService
{
    private readonly AccountingDbContext _db;
    private readonly IEInvoiceProvider _provider;
    private readonly EInvoiceOptions _options;
    private readonly IBusinessClock _clock;
    private readonly ILogger<EInvoiceService> _logger;

    public EInvoiceService(
        AccountingDbContext db,
        IEInvoiceProvider provider,
        EInvoiceOptions options,
        IBusinessClock clock,
        ILogger<EInvoiceService> logger)
    {
        _db = db;
        _provider = provider;
        _options = options;
        _clock = clock;
        _logger = logger;
    }

    public EInvoiceModeDto Mode() => new(
        _options.Mode.ToString(),
        _provider.ProviderCode,
        _provider.IsSandbox,
        _options.Kind.ToString(),
        _options.IssueTrigger.ToString(),
        string.IsNullOrWhiteSpace(_options.Series)
            ? (_provider.IsSandbox ? SandboxEInvoiceProvider.SandboxSeries : string.Empty)
            : _options.Series,
        _options.QueueWarningDays,
        EInvoiceNotices.For(_options.Mode));

    public async Task<EInvoiceResultDto> IssueAsync(Guid invoiceId, CancellationToken ct = default)
    {
        var invoice = await LoadIssuableAsync(i => i.Id == invoiceId, invoiceId, ct);
        return await IssueCoreAsync(invoice, ct);
    }

    public async Task<EInvoiceResultDto> IssueByOrderAsync(Guid orderId, CancellationToken ct = default)
    {
        var invoice = await LoadIssuableAsync(i => i.OrderId == orderId, orderId, ct);
        return await IssueCoreAsync(invoice, ct);
    }

    private async Task<EInvoiceResultDto> IssueCoreAsync(Invoice invoice, CancellationToken ct)
    {
        var document = EInvoiceDocumentFactory.Create(invoice, _options.Kind);
        var result = await _provider.IssueAsync(document, ct);

        if (!result.Success)
        {
            invoice.UpdateEInvoice(
                invoice.EInvoiceId ?? string.Empty, invoice.EInvoiceNumber ?? string.Empty,
                invoice.EInvoiceLookupCode ?? string.Empty, EInvoiceStatuses.Failed, _clock.UtcNow.UtcDateTime);
            await _db.SaveChangesAsync(ct);
            _logger.LogWarning("Phát hành HĐĐT thất bại cho hoá đơn {Number}: {Error}",
                invoice.InvoiceNumber, result.Error);
            throw new DomainException(
                $"Nhà cung cấp HĐĐT từ chối phát hành: {result.Error}. Hoá đơn vẫn nằm trong hàng đợi chờ xuất.");
        }

        invoice.UpdateEInvoice(result.Series, result.Number, result.LookupCode ?? string.Empty,
            EInvoiceStatuses.Issued, result.IssuedAt);
        await _db.SaveChangesAsync(ct);

        return new EInvoiceResultDto(
            invoice.Id, invoice.InvoiceNumber, EInvoiceStatuses.Issued, _provider.ProviderCode,
            result.IsSandbox, result.Series, result.Number, result.LookupCode, result.IssuedAt,
            result.IsSandbox ? EInvoiceNotices.Sandbox : null);
    }

    public async Task<EInvoiceResultDto> RecordExternalAsync(
        Guid invoiceId, RecordExternalEInvoiceRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Series))
            throw new RequestValidationException("series", "Ký hiệu hoá đơn là bắt buộc.");
        if (string.IsNullOrWhiteSpace(request.Number))
            throw new RequestValidationException("number", "Số hoá đơn là bắt buộc.");

        var issuedAt = request.IssuedAt ?? _clock.UtcNow.UtcDateTime;
        if (issuedAt > _clock.UtcNow.UtcDateTime.AddDays(1))
            throw new RequestValidationException("issuedAt", "Ngày xuất hoá đơn không được ở tương lai.");

        var invoice = await LoadIssuableAsync(i => i.Id == invoiceId, invoiceId, ct);

        invoice.UpdateEInvoice(request.Series.Trim(), request.Number.Trim(),
            request.LookupCode?.Trim() ?? string.Empty, EInvoiceStatuses.ExternalRecorded, issuedAt);
        await _db.SaveChangesAsync(ct);

        return new EInvoiceResultDto(
            invoice.Id, invoice.InvoiceNumber, EInvoiceStatuses.ExternalRecorded, _provider.ProviderCode,
            IsSandbox: false, request.Series.Trim(), request.Number.Trim(), request.LookupCode, issuedAt,
            Notice: null);
    }

    /// <summary>Bổ sung/sửa khối người mua — KHOÁ ngay khi hoá đơn đã có HĐĐT (D07 §Bảo mật).</summary>
    public async Task<EInvoiceQueueItemDto> UpdateBuyerAsync(
        Guid invoiceId, UpdateEInvoiceBuyerRequest request, CancellationToken ct = default)
    {
        var invoice = await _db.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId, ct)
            ?? throw NotFoundException.For("hoá đơn", invoiceId);

        if (EInvoiceStatuses.IsSettled(invoice.EInvoiceStatus))
            throw new ConflictException(
                "Hoá đơn điện tử đã xuất — không sửa được thông tin người mua. Hãy lập hoá đơn thay thế trên phần mềm nhà cung cấp.");

        invoice.SetBuyer(request.BuyerType, request.LegalName, request.FullName, request.TaxCode,
            request.BudgetUnitCode, request.Address, request.Email, request.Phone);
        await _db.SaveChangesAsync(ct);

        var buyer = EInvoiceDocumentFactory.BuyerOf(invoice);
        var age = (int)Math.Floor((_clock.UtcNow.UtcDateTime - invoice.IssueDate).TotalDays);
        return new EInvoiceQueueItemDto(
            invoice.Id, invoice.InvoiceNumber, invoice.OrderId, invoice.OrderNumber, invoice.IssueDate,
            invoice.TotalAmount, invoice.SubTotal, invoice.VatAmount, buyer.DisplayName,
            invoice.BuyerTaxCode, invoice.BuyerAddress, buyer.IsConsumer,
            invoice.EInvoiceStatus ?? EInvoiceStatuses.NotIssued, age, age >= _options.QueueWarningDays);
    }

    /// <summary>Chốt chặn trạng thái dùng chung cho phát hành và ghi nhận ngoài.</summary>
    private async Task<Invoice> LoadIssuableAsync(
        System.Linq.Expressions.Expression<Func<Invoice, bool>> predicate, object key, CancellationToken ct)
    {
        var invoice = await _db.Invoices.Include(i => i.Lines).Include(i => i.Payments)
            .FirstOrDefaultAsync(predicate, ct)
            ?? throw NotFoundException.For("hoá đơn", key);

        if (invoice.Type != InvoiceType.Receivable)
            throw new ConflictException("Chỉ hoá đơn bán ra mới xuất được hoá đơn điện tử.");
        if (invoice.Status == InvoiceStatus.Draft)
            throw new ConflictException("Hoá đơn còn ở trạng thái nháp — phát hành hoá đơn nội bộ trước.");
        if (invoice.Status == InvoiceStatus.Cancelled)
            throw new ConflictException("Hoá đơn đã huỷ — không xuất được hoá đơn điện tử.");
        if (invoice.Lines.Count == 0)
            throw new ConflictException("Hoá đơn không có dòng hàng nào.");
        if (EInvoiceStatuses.IsSettled(invoice.EInvoiceStatus))
            throw new ConflictException(
                $"Hoá đơn này đã có hoá đơn điện tử ({invoice.EInvoiceStatus}: ký hiệu {invoice.EInvoiceId}, số {invoice.EInvoiceNumber}).");

        return invoice;
    }
}
