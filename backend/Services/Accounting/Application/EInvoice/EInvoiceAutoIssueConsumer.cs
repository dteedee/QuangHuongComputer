using Accounting.Infrastructure;
using Accounting.Infrastructure.EInvoice;
using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Accounting.Application.EInvoice;

/// <summary>
/// Mốc phát hành HĐĐT: <c>InvoiceRequestedEvent</c> do W2-23 phát đúng một lần cho mỗi đơn
/// (lúc giao hàng — NĐ 254/2026 Đ.9.1, không phụ thuộc đã thu tiền).
///
/// NGUYÊN TẮC BẤT DI BẤT DỊCH: consumer này KHÔNG BAO GIỜ ném lỗi. Một sự cố của nhà cung cấp
/// HĐĐT không được phép làm hỏng luồng bán hàng hay POS — hoá đơn chỉ đơn giản nằm lại trong
/// hàng đợi "Chờ xuất HĐĐT" để kế toán xử lý (D07 §5).
///
/// Ở chế độ External/Off (mặc định Production) đây là no-op có chủ đích: không có cuộc gọi ra
/// ngoài nào cả, hàng đợi CHÍNH LÀ cơ chế.
/// </summary>
public class EInvoiceAutoIssueConsumer : IConsumer<InvoiceRequestedEvent>
{
    /// <summary>Số lần chờ hoá đơn nội bộ xuất hiện (consumer lập hoá đơn của W2-14 chạy song song).</summary>
    private const int InvoiceWaitAttempts = 5;

    private static readonly TimeSpan InvoiceWaitDelay = TimeSpan.FromMilliseconds(400);

    private readonly AccountingDbContext _db;
    private readonly EInvoiceService _einvoice;
    private readonly EInvoiceOptions _options;
    private readonly ILogger<EInvoiceAutoIssueConsumer> _logger;

    public EInvoiceAutoIssueConsumer(
        AccountingDbContext db,
        EInvoiceService einvoice,
        EInvoiceOptions options,
        ILogger<EInvoiceAutoIssueConsumer> logger)
    {
        _db = db;
        _einvoice = einvoice;
        _options = options;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<InvoiceRequestedEvent> context)
    {
        var orderId = context.Message.OrderId;

        if (_options.IssueTrigger != EInvoiceIssueTrigger.InvoiceRequested)
        {
            _logger.LogDebug("EInvoice:IssueTrigger=Manual — đơn {OrderId} chờ kế toán bấm phát hành.", orderId);
            return;
        }

        // External/Off: không có gì để gọi. Hoá đơn nội bộ đã vào hàng đợi chờ xuất HĐĐT.
        if (_options.Mode is EInvoiceMode.External or EInvoiceMode.Off)
            return;

        try
        {
            if (!await WaitForInvoiceAsync(orderId, context.CancellationToken))
            {
                _logger.LogWarning(
                    "Chưa có hoá đơn nội bộ cho đơn {OrderId} khi nhận InvoiceRequested — để lại trong hàng đợi chờ xuất HĐĐT.",
                    orderId);
                return;
            }

            var result = await _einvoice.IssueByOrderAsync(orderId, context.CancellationToken);
            _logger.LogInformation(
                "Đã phát hành HĐĐT {Series}/{Number} ({Provider}, sandbox={IsSandbox}) cho đơn {OrderId}.",
                result.Series, result.Number, result.Provider, result.IsSandbox, orderId);
        }
        catch (Exception ex)
        {
            // Bao gồm cả trường hợp đã phát hành trước đó (ConflictException) — đều không phải lý do
            // để làm hỏng luồng bán hàng.
            _logger.LogWarning(ex,
                "Không phát hành được HĐĐT cho đơn {OrderId} — hoá đơn ở lại hàng đợi chờ xuất.", orderId);
        }
    }

    private async Task<bool> WaitForInvoiceAsync(Guid orderId, CancellationToken ct)
    {
        for (var attempt = 0; attempt < InvoiceWaitAttempts; attempt++)
        {
            if (await _db.Invoices.AsNoTracking().AnyAsync(i => i.OrderId == orderId, ct))
                return true;

            await Task.Delay(InvoiceWaitDelay, ct);
        }

        return false;
    }
}
