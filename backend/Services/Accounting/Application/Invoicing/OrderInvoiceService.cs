using Accounting.Domain;
using Accounting.Infrastructure;
using BuildingBlocks.Configuration;
using BuildingBlocks.Documents;
using BuildingBlocks.TaxEngine;
using BuildingBlocks.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Accounting.Application.Invoicing;

/// <summary>
/// Lập hoá đơn bán ra từ một đơn hàng, ĐÚNG TỔNG và CHỈ MỘT LẦN.
///
/// Chống trùng hai lớp:
///  1. kiểm tra <c>Invoices.OrderId</c> trước khi tạo;
///  2. unique index <c>IX_Invoices_OrderId_Unique</c> — nếu hai consumer chạy song song thì
///     một bên sẽ nhận <see cref="DbUpdateException"/> và được nuốt ở đây.
/// Chỉ kiểm tra ở tầng ứng dụng là không đủ: hai message đến cùng lúc vẫn lọt qua bước 1.
/// </summary>
public class OrderInvoiceService
{
    private readonly AccountingDbContext _db;
    private readonly IDocumentNumberService _documentNumbers;
    private readonly IBusinessClock _clock;
    private readonly IAppSettings _settings;
    private readonly ITaxSettingsProvider? _taxSettings;
    private readonly ILogger<OrderInvoiceService> _logger;

    public OrderInvoiceService(
        AccountingDbContext db,
        IDocumentNumberService documentNumbers,
        IBusinessClock clock,
        IAppSettings settings,
        ILogger<OrderInvoiceService> logger,
        ITaxSettingsProvider? taxSettings = null)
    {
        _db = db;
        _documentNumbers = documentNumbers;
        _clock = clock;
        _settings = settings;
        _logger = logger;
        _taxSettings = taxSettings;
    }

    /// <summary>Trả về hoá đơn đã tạo, hoặc <c>null</c> nếu đơn này đã có hoá đơn (phát lại sự kiện).</summary>
    public async Task<Invoice?> CreateAsync(OrderInvoicePayload payload, CancellationToken ct = default)
    {
        var existing = await _db.Invoices.AsNoTracking()
            .Where(i => i.OrderId == payload.OrderId)
            .Select(i => new { i.Id, i.InvoiceNumber })
            .FirstOrDefaultAsync(ct);

        if (existing is not null)
        {
            _logger.LogInformation(
                "Đơn {OrderNumber} đã có hoá đơn {InvoiceNumber} — không lập thêm.",
                payload.OrderNumber, existing.InvoiceNumber);
            if (payload.SettleImmediately) await SettleExistingAsync(payload, ct);
            return null;
        }

        var issuedAtUtc = _clock.UtcNow.UtcDateTime;
        var invoiceBusinessDate = _clock.TodayVn;
        var window = await ResolveVatWindowAsync(ct);

        var lines = OrderInvoiceLineBuilder.Build(payload.Items, payload.Shipping, invoiceBusinessDate, window);
        if (lines.Count == 0)
        {
            _logger.LogWarning("Đơn {OrderNumber} không có dòng hàng nào — không lập hoá đơn.", payload.OrderNumber);
            return null;
        }

        var dueDays = _settings.GetInt("Accounting:InvoiceDueDays", 30);
        var number = await _documentNumbers.NextAsync(DocumentNumberTypes.Invoice, ct);

        var invoice = Invoice.CreateReceivable(
            customerId: payload.CustomerId == Guid.Empty ? null : payload.CustomerId,
            organizationAccountId: null,
            invoiceNumber: number,
            issueDate: issuedAtUtc,
            dueDate: payload.SettleImmediately ? issuedAtUtc : issuedAtUtc.AddDays(dueDays),
            notes: $"Đơn hàng {payload.OrderNumber}");

        invoice.LinkToOrder(payload.OrderId, payload.OrderNumber, invoiceBusinessDate);

        if (payload.Buyer is { } buyer)
        {
            invoice.SetBuyer(
                buyer.BuyerType, buyer.BuyerLegalName, buyer.BuyerFullName, buyer.BuyerTaxCode,
                buyer.BuyerBudgetUnitCode, buyer.BuyerAddress, buyer.BuyerEmail, buyer.BuyerPhone);
        }

        foreach (var line in lines) invoice.AddLine(line);

        invoice.Issue(issuedAtUtc);

        if (payload.SettleImmediately && invoice.TotalAmount > 0)
        {
            invoice.RecordPayment(
                invoice.TotalAmount,
                $"Đơn {payload.OrderNumber} đã thanh toán",
                PaymentMethod.BankTransfer,
                issuedAtUtc);
        }

        _db.Invoices.Add(invoice);

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (IsDuplicateOrder(ex))
        {
            _db.ChangeTracker.Clear();
            _logger.LogInformation(
                "Một consumer khác vừa lập hoá đơn cho đơn {OrderNumber} — không lập thêm.", payload.OrderNumber);
            if (payload.SettleImmediately) await SettleExistingAsync(payload, ct);
            return null;
        }

        _logger.LogInformation(
            "Hoá đơn {InvoiceNumber} cho đơn {OrderNumber}: {Total} VND ({LineCount} dòng).",
            invoice.InvoiceNumber, payload.OrderNumber, invoice.TotalAmount, lines.Count);

        return invoice;
    }

    private async Task<VatReductionWindow> ResolveVatWindowAsync(CancellationToken ct)
    {
        if (_taxSettings is null) return VatReductionWindow.Legal;

        try
        {
            var settings = await _taxSettings.GetAsync(ct);
            var window = VatReductionWindow.FromSettings(settings, out var problems);
            foreach (var problem in problems)
                _logger.LogWarning("Cấu hình thuế GTGT không hợp lệ, dùng hằng số luật định: {Problem}", problem);
            return window;
        }
        catch (Exception ex)
        {
            // Cấu hình hỏng KHÔNG được làm hỏng phép tính tiền — rơi về hằng số luật định.
            _logger.LogWarning(ex, "Không đọc được cấu hình thuế GTGT — dùng hằng số luật định.");
            return VatReductionWindow.Legal;
        }
    }

    /// <summary>
    /// Sales phát CẢ <c>OrderDeliveredEvent</c> lẫn <c>OrderPaidEvent</c> trong cùng một lần
    /// (đơn POS / nhận tại cửa hàng, đơn COD thu tiền lúc giao; <c>OrderEventPublisher</c>).
    /// Nếu sự kiện Delivered tới trước, hoá đơn được lập CHƯA tất toán; sự kiện Paid tới sau
    /// không được phép bị nuốt như một lần phát lại, nếu không khoản phải thu của một đơn đã thu đủ
    /// tiền sẽ treo mãi trên sổ công nợ. Ở đây tất toán phần còn lại — lặp lại thì còn lại = 0 nên
    /// không làm gì; hai lần ghi đồng thời bị <c>xmin</c> chặn và MassTransit thử lại.
    /// </summary>
    private async Task SettleExistingAsync(OrderInvoicePayload payload, CancellationToken ct)
    {
        var invoice = await _db.Invoices.FirstOrDefaultAsync(i => i.OrderId == payload.OrderId, ct);
        if (invoice is null
            || invoice.Status is InvoiceStatus.Draft or InvoiceStatus.Cancelled
            || invoice.RemainingAmount <= 0)
            return;

        var remaining = invoice.RemainingAmount;
        invoice.RecordPayment(
            remaining,
            $"Đơn {payload.OrderNumber} đã thanh toán",
            PaymentMethod.BankTransfer,
            _clock.UtcNow.UtcDateTime);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Hoá đơn {InvoiceNumber} của đơn {OrderNumber} được tất toán {Amount} VND theo sự kiện đã thanh toán.",
            invoice.InvoiceNumber, payload.OrderNumber, remaining);
    }

    private static bool IsDuplicateOrder(DbUpdateException ex)
        => ex.InnerException?.Message.Contains("IX_Invoices_OrderId_Unique", StringComparison.OrdinalIgnoreCase) == true;
}
