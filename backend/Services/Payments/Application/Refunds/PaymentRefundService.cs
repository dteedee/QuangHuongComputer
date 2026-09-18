using BuildingBlocks.Endpoints;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Payments.Application.Providers;
using Payments.Domain;
using Payments.Infrastructure;

namespace Payments.Application.Refunds;

/// <summary>
/// D04 mục 4 — đường đi của một khoản hoàn tiền, dùng chung cho cả API quản trị và consumer
/// `RefundRequested` (huỷ đơn đã trả / trả hàng).
///
/// Quy tắc: `Succeeded` là trạng thái cuối, chỉ đi tiếp sang hoàn tiền; tiền chỉ được ghi là "đã hoàn"
/// khi CÓ mã tham chiếu thật. Cổng lỗi thì phiếu rơi về việc thủ công chứ không bao giờ biến mất.
/// </summary>
public sealed class PaymentRefundService
{
    private readonly PaymentsDbContext _db;
    private readonly PaymentProviderRegistry _registry;
    private readonly ILogger<PaymentRefundService> _logger;

    public PaymentRefundService(
        PaymentsDbContext db,
        PaymentProviderRegistry registry,
        ILogger<PaymentRefundService> logger)
    {
        _db = db;
        _registry = registry;
        _logger = logger;
    }

    /// <summary>Tạo phiếu hoàn. Idempotent theo <paramref name="idempotencyKey"/>.</summary>
    public async Task<PaymentRefund> RequestAsync(
        Guid paymentIntentId,
        decimal amount,
        RefundChannel channel,
        string reason,
        Guid? requestedBy,
        string idempotencyKey,
        CancellationToken ct = default)
    {
        // `idempotencyKey` của endpoint quản trị do client gửi lên, nên phải so cả PaymentIntentId:
        // nếu không, gửi lại một khoá đã dùng cho intent KHÁC sẽ trả về phiếu hoàn của đơn người khác
        // kèm số tiền của đơn đó, và người gọi tưởng phiếu mình vừa tạo đã tồn tại.
        var existing = await _db.PaymentRefunds
            .FirstOrDefaultAsync(r => r.IdempotencyKey == idempotencyKey, ct);
        if (existing is not null)
        {
            if (existing.PaymentIntentId != paymentIntentId)
                throw new ConflictException("Khoá chống trùng đã dùng cho một giao dịch thanh toán khác");
            return existing;
        }

        var intent = await _db.PaymentIntents.FirstOrDefaultAsync(p => p.Id == paymentIntentId, ct)
            ?? throw NotFoundException.For("giao dịch thanh toán", paymentIntentId);

        PaymentRefund refund;
        try
        {
            refund = PaymentRefund.Request(intent, amount, channel, reason, requestedBy, idempotencyKey);
        }
        catch (InvalidOperationException ex) { throw new ConflictException(ex.Message); }
        catch (ArgumentOutOfRangeException ex) { throw new DomainException(ex.Message); }

        _db.PaymentRefunds.Add(refund);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Tạo phiếu hoàn {RefundId} cho intent {IntentId}, số tiền {Amount}", refund.Id, intent.Id, amount);
        return refund;
    }

    /// <summary>
    /// Duyệt phiếu. Cổng có API hoàn thì gọi luôn; lỗi hoặc không hỗ trợ thì phiếu ở lại hàng đợi
    /// thủ công của kế toán (D04: "lỗi → RefundTask", không để bản ghi mơ hồ).
    /// </summary>
    public async Task<PaymentRefund> ApproveAsync(Guid refundId, Guid? approver, CancellationToken ct = default)
    {
        var refund = await _db.PaymentRefunds.FirstOrDefaultAsync(r => r.Id == refundId, ct)
            ?? throw NotFoundException.For("phiếu hoàn tiền", refundId);
        var intent = await _db.PaymentIntents.FirstOrDefaultAsync(p => p.Id == refund.PaymentIntentId, ct)
            ?? throw NotFoundException.For("giao dịch thanh toán", refund.PaymentIntentId);

        try { refund.Approve(approver); }
        catch (InvalidOperationException ex) { throw new ConflictException(ex.Message); }

        var provider = _registry.Resolve(intent.Provider);
        if (provider is { SupportsGatewayRefund: true })
        {
            var result = await provider.RefundAsync(intent, refund.Amount, refund.Reason, ct);
            if (result is { Supported: true, Succeeded: true, Reference: not null })
            {
                await ApplyCompletionAsync(refund, intent, result.Reference, RefundChannel.Gateway, ct);
                return refund;
            }
            if (result.Supported)
            {
                refund.MarkGatewayFailed(result.Error ?? "Cổng thanh toán từ chối hoàn tiền");
                _logger.LogWarning("Hoàn tiền qua cổng thất bại cho {RefundId} — chuyển thành việc thủ công", refundId);
            }
        }

        await _db.SaveChangesAsync(ct);
        return refund;
    }

    /// <summary>Kế toán ghi nhận đã trả tiền cho khách (chuyển khoản tay hoặc tiền mặt).</summary>
    public async Task<PaymentRefund> CompleteAsync(
        Guid refundId, string reference, RefundChannel channel, CancellationToken ct = default)
    {
        var refund = await _db.PaymentRefunds.FirstOrDefaultAsync(r => r.Id == refundId, ct)
            ?? throw NotFoundException.For("phiếu hoàn tiền", refundId);
        var intent = await _db.PaymentIntents.FirstOrDefaultAsync(p => p.Id == refund.PaymentIntentId, ct)
            ?? throw NotFoundException.For("giao dịch thanh toán", refund.PaymentIntentId);

        await ApplyCompletionAsync(refund, intent, reference, channel, ct);
        return refund;
    }

    public async Task<PaymentRefund> RejectAsync(Guid refundId, string reason, CancellationToken ct = default)
    {
        var refund = await _db.PaymentRefunds.FirstOrDefaultAsync(r => r.Id == refundId, ct)
            ?? throw NotFoundException.For("phiếu hoàn tiền", refundId);

        try { refund.Reject(reason); }
        catch (InvalidOperationException ex) { throw new ConflictException(ex.Message); }

        await _db.SaveChangesAsync(ct);
        return refund;
    }

    private async Task ApplyCompletionAsync(
        PaymentRefund refund, PaymentIntent intent, string reference, RefundChannel channel, CancellationToken ct)
    {
        try
        {
            refund.Complete(reference, channel);
            intent.RegisterRefund(refund.Amount);
        }
        catch (InvalidOperationException ex) { throw new ConflictException(ex.Message); }
        catch (ArgumentException ex) { throw new DomainException(ex.Message); }

        // Ghi DB TRƯỚC khi báo ra ngoài — kế toán không bao giờ được thấy credit note của
        // một khoản hoàn chưa commit.
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Đã hoàn {Amount} cho intent {IntentId} (phiếu {RefundId}, kênh {Channel})",
            refund.Amount, intent.Id, refund.Id, channel);
    }
}
