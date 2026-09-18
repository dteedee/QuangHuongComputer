using Accounting.Application.Invoicing;
using Accounting.Domain;
using Accounting.Infrastructure;
using BuildingBlocks.Messaging.IntegrationEvents;
using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Application.Consumers;

/// <summary>
/// Đơn bị huỷ. Nếu hoá đơn CHƯA thu đồng nào thì huỷ thẳng hoá đơn;
/// nếu đã thu tiền thì không được huỷ chứng từ đã phát hành mà phải lập giấy báo có.
/// </summary>
public class OrderCancelledCreditNoteConsumer : IConsumer<OrderCancelledEvent>
{
    private readonly AccountingDbContext _db;
    private readonly CreditNoteService _creditNotes;

    public OrderCancelledCreditNoteConsumer(AccountingDbContext db, CreditNoteService creditNotes)
    {
        _db = db;
        _creditNotes = creditNotes;
    }

    public async Task Consume(ConsumeContext<OrderCancelledEvent> context)
    {
        var msg = context.Message;
        var ct = context.CancellationToken;

        var invoice = await _db.Invoices
            .FirstOrDefaultAsync(i => i.OrderId == msg.OrderId && i.Type == InvoiceType.Receivable, ct);

        if (invoice is null || invoice.Status == InvoiceStatus.Cancelled) return;

        if (invoice.PaidAmount == 0)
        {
            invoice.Cancel($"Đơn {msg.OrderNumber} bị huỷ: {msg.Reason}");
            await _db.SaveChangesAsync(ct);
            return;
        }

        await _creditNotes.IssueForOrderAsync(
            sourceKey: $"order-cancelled:{msg.OrderId}",
            orderId: msg.OrderId,
            customerId: msg.CustomerId,
            grossAmount: invoice.PaidAmount,
            reasonCode: CreditNoteReason.OrderCancelled,
            reason: $"Huỷ đơn {msg.OrderNumber}: {msg.Reason}",
            ct: ct);
    }
}

/// <summary>
/// <c>RefundRequestedEvent</c> KHÔNG sinh giấy báo có.
///
/// Lý do (đo trên mã nguồn Sales ngày 18/09/2026, W2-14 kiểm chứng đối kháng):
///  1. <c>OrderLifecycleService.CancelAsync</c> phát ĐỒNG THỜI <c>OrderCancelledEvent</c> VÀ
///     <c>RefundRequestedEvent</c> khi đơn đã thu tiền. Nếu cả hai đều lập giấy báo có thì
///     một lần huỷ đơn sinh HAI giấy báo có (hai <c>SourceKey</c> khác nhau nên unique index
///     không chặn được) — ghi giảm doanh thu và thuế đầu ra GẤP ĐÔI.
///  2. <c>ReturnOrchestrator</c> phát <c>RefundRequestedEvent</c> ngay lúc khách GỬI yêu cầu,
///     trước khi được duyệt; số tiền còn có thể đổi khi xử lý xong (phí thu lại). Lập chứng từ
///     giảm trừ cho một yêu cầu chưa duyệt là sai bản chất, và khi hoàn tất
///     <c>ReturnCompletedEvent</c> sẽ lập giấy báo có lần thứ hai.
///
/// Mọi <c>RefundRequestedEvent</c> hôm nay đều có một sự kiện KẾT THÚC đi kèm
/// (<c>OrderCancelledEvent</c> hoặc <c>ReturnCompletedEvent</c>) mang khoá ổn định và số tiền
/// cuối cùng — giấy báo có được lập ở đó. Việc chi tiền hoàn là của module Payments
/// (<c>Payments.Application.Refunds.RefundRequestedConsumer</c>), không phải của Kế toán.
/// </summary>

/// <summary>Trả hàng hoàn tất → giấy báo có theo giá trị hàng trả.</summary>
public class ReturnCompletedCreditNoteConsumer : IConsumer<ReturnCompletedEvent>
{
    private readonly CreditNoteService _creditNotes;

    public ReturnCompletedCreditNoteConsumer(CreditNoteService creditNotes) => _creditNotes = creditNotes;

    public Task Consume(ConsumeContext<ReturnCompletedEvent> context)
    {
        var msg = context.Message;
        return _creditNotes.IssueForOrderAsync(
            sourceKey: $"return:{msg.ReturnId}",
            orderId: msg.OrderId,
            customerId: msg.CustomerId,
            grossAmount: msg.RefundAmount,
            reasonCode: CreditNoteReason.Return,
            reason: "Khách trả hàng",
            ct: context.CancellationToken);
    }
}
