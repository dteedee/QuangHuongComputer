using System.Security.Claims;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Messaging.IntegrationEvents;
using BuildingBlocks.Security;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Payments.Application;
using Payments.Domain;
using Payments.Infrastructure;

namespace Payments.Endpoints.Admin;

/// <summary>
/// D04 mục 4 — đối soát tay, quyền `Payments.Reconcile`.
///
/// Hàng "Chưa gán" là khoản tiền vào KHÔNG khớp được mã thanh toán. Với mỗi khoản, hệ thống có thể
/// đưa MỘT gợi ý (trùng số tiền, còn trong cửa sổ giữ đơn, đúng một ứng viên) — nhưng chỉ là gợi ý:
/// **không bao giờ tự xác nhận theo số tiền**. Đó là luật D04 còn lại sau khi chiến lược khớp
/// "chỉ theo số tiền" bị xoá, và nó tồn tại vì có app ngân hàng bỏ mất nội dung chuyển khoản.
/// </summary>
public static class PaymentAdminReconcileEndpoints
{
    public static void MapPaymentAdminReconcileEndpoints(this RouteGroupBuilder admin)
    {
        var group = admin.MapGroup("/reconciliation").RequireAuthorization(Permissions.Payments.Reconcile);

        // Khoản tiền vào chưa gán được đơn + gợi ý (nếu có).
        group.MapGet("/unassigned", async (PaymentsDbContext db, CancellationToken ct) =>
        {
            var transactions = await db.SePayTransactions.AsNoTracking()
                .Where(t => t.TransferType == "in" && !t.IsProcessed)
                .OrderByDescending(t => t.TransactionDate)
                .Take(100)
                .ToListAsync(ct);

            var pending = await db.PaymentIntents.AsNoTracking()
                .Where(p => p.Status == PaymentStatus.Pending && p.Provider == PaymentProvider.SePay)
                .ToListAsync(ct);

            var now = DateTime.UtcNow;
            var rows = transactions.Select(t =>
            {
                var suggestion = SePayPaymentMatcher.Suggest(pending, t.TransferAmount, now);
                return new
                {
                    transactionId = t.Id,
                    t.TransactionDate,
                    t.Gateway,
                    t.AccountNumber,
                    t.Content,
                    amount = t.TransferAmount,
                    t.ReferenceCode,
                    t.ProcessingError,
                    suggestion = suggestion is null ? null : new
                    {
                        paymentId = suggestion.Id,
                        suggestion.OrderId,
                        suggestion.Amount,
                        suggestion.PaymentCode,
                        // Người thật phải bấm; API này không tự gán.
                        reason = "Trùng số tiền và còn trong cửa sổ giữ đơn — cần người xác nhận"
                    }
                };
            });

            return Results.Ok(rows);
        });

        // Gán một khoản tiền vào cho một intent (kế toán bấm sau khi đã đối chiếu sao kê).
        group.MapPost("/assign", async (
            AssignTransactionDto model,
            PaymentsDbContext db,
            PaymentWebhookHandler handler,
            CancellationToken ct) =>
        {
            var transaction = await db.SePayTransactions.FirstOrDefaultAsync(t => t.Id == model.TransactionId, ct)
                ?? throw NotFoundException.For("giao dịch ngân hàng", model.TransactionId);
            var intent = await db.PaymentIntents.FirstOrDefaultAsync(p => p.Id == model.PaymentId, ct)
                ?? throw NotFoundException.For("giao dịch thanh toán", model.PaymentId);

            if (intent.Status != PaymentStatus.Pending)
                throw new ConflictException($"Giao dịch thanh toán đang ở trạng thái {intent.Status}, không gán được.");
            if (transaction.TransferAmount != intent.Amount)
                throw new ConflictException(
                    $"Số tiền lệch: nhận {transaction.TransferAmount:N0}đ, đơn cần {intent.Amount:N0}đ.");

            var result = await handler.ProcessAsync(
                provider: "SePay",
                transactionId: $"manual:{transaction.Id}",
                paymentIntentId: intent.Id,
                success: true,
                failureReason: null,
                gatewayAmount: transaction.TransferAmount,
                ct: ct);

            transaction.IsProcessed = result.Processed;
            transaction.RelatedOrderId = intent.OrderId;
            transaction.ProcessingError = null;
            await db.SaveChangesAsync(ct);

            return Results.Ok(new { assigned = result.Processed, idempotent = result.WasIdempotent, intent.OrderId });
        });

        // Xác nhận đã nhận chuyển khoản khi KHÔNG có webhook (tầng 0b thuần thủ công).
        group.MapPost("/confirm/{paymentId:guid}", async (
            Guid paymentId,
            ManualConfirmDto model,
            PaymentsDbContext db,
            IPublishEndpoint bus,
            CancellationToken ct) =>
        {
            var intent = await db.PaymentIntents.FirstOrDefaultAsync(p => p.Id == paymentId, ct)
                ?? throw NotFoundException.For("giao dịch thanh toán", paymentId);
            if (intent.Status != PaymentStatus.Pending)
                throw new ConflictException($"Giao dịch đang ở trạng thái {intent.Status}, không xác nhận lại được.");

            try { intent.ConfirmManually(model.BankReference); }
            catch (ArgumentException ex) { throw new DomainException(ClientSafeError.Message(ex)); }

            await db.SaveChangesAsync(ct);
            await bus.Publish(new PaymentSucceededEvent(intent.Id, intent.OrderId, intent.Amount, DateTime.UtcNow), ct);

            return Results.Ok(new { confirmed = true, intent.OrderId, reference = intent.ReconciliationReference });
        });

        // D04 mục 4 hàng COD: kế toán tick "đã nhận tiền đối soát" theo ĐỢT (chọn nhiều).
        group.MapPost("/cod/settle", async (
            CodSettleDto model,
            PaymentsDbContext db,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            if (model.PaymentIds is null || model.PaymentIds.Count == 0)
                throw new RequestValidationException("paymentIds", "Chọn ít nhất một khoản COD.");

            var intents = await db.PaymentIntents
                .Where(p => model.PaymentIds.Contains(p.Id))
                .Where(p => p.Provider == PaymentProvider.COD && p.Settlement == CodSettlementStatus.AwaitingRemittance)
                .ToListAsync(ct);

            foreach (var intent in intents) intent.MarkCodRemitted();
            await db.SaveChangesAsync(ct);

            return Results.Ok(new { settled = intents.Count, by = user.UserId() });
        });
    }
}

public sealed record AssignTransactionDto(int TransactionId, Guid PaymentId);

public sealed record ManualConfirmDto(string BankReference);

public sealed record CodSettleDto(List<Guid> PaymentIds);
