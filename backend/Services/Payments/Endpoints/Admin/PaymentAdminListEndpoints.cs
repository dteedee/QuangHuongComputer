using System.Linq.Expressions;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Payments.Domain;
using Payments.Infrastructure;

namespace Payments.Endpoints.Admin;

/// <summary>
/// Màn "Thanh toán" của back-office: danh sách có bộ lọc + chi tiết KÈM DẤU VẾT WEBHOOK.
///
/// Dấu vết webhook là thứ quyết định khi tiền lệch: bảng `ProcessedWebhooks` ghi mọi lần cổng gọi
/// về, kể cả lần bị từ chối vì lệch số tiền (`AmountMismatch`) hoặc không khớp đơn (`Ignored`).
/// Không có nó thì "khách bảo đã chuyển" là lời chống lời.
/// </summary>
public static class PaymentAdminListEndpoints
{
    public static void MapPaymentAdminListEndpoints(this RouteGroupBuilder admin)
    {
        var group = admin.MapGroup("/payments").RequireAuthorization(Permissions.Payments.View);

        group.MapGet("", async (
            [AsParameters] PagedRequest paging,
            string? status,
            string? provider,
            DateTime? from,
            DateTime? to,
            PaymentsDbContext db,
            CancellationToken ct) =>
        {
            var query = db.PaymentIntents.AsQueryable();

            if (Enum.TryParse<PaymentStatus>(status, ignoreCase: true, out var parsedStatus))
                query = query.Where(p => p.Status == parsedStatus);
            if (Enum.TryParse<PaymentProvider>(provider, ignoreCase: true, out var parsedProvider))
                query = query.Where(p => p.Provider == parsedProvider);
            if (from is not null) query = query.Where(p => p.CreatedAt >= from);
            if (to is not null) query = query.Where(p => p.CreatedAt <= to);

            // `search` khớp mã thanh toán, mã cổng hoặc mã tham chiếu ngân hàng.
            var search = paging.Search?.Trim();
            if (!string.IsNullOrEmpty(search))
            {
                var upper = search.ToUpperInvariant();
                query = query.Where(p =>
                    (p.PaymentCode != null && p.PaymentCode.Contains(upper))
                    || (p.ExternalId != null && p.ExternalId.Contains(search))
                    || (p.ReconciliationReference != null && p.ReconciliationReference.Contains(search)));
            }

            var sortable = new Dictionary<string, Expression<Func<PaymentIntent, object?>>>
            {
                ["createdAt"] = p => p.CreatedAt,
                ["amount"] = p => p.Amount,
                ["status"] = p => p.Status,
                ["provider"] = p => p.Provider
            };

            var result = await query
                .ApplySort(paging, sortable, p => p.CreatedAt)
                .Select(p => new AdminPaymentListItem(
                    p.Id, p.OrderId, p.Amount, p.AmountRefunded, p.Status.ToString(), p.Provider.ToString(),
                    p.PaymentCode, p.ExternalId, p.ReconciliationReference, p.Settlement.ToString(),
                    p.ExpiresAt, p.ConfirmedAt, p.CreatedAt))
                .ToPagedResultAsync(paging, ct);

            return Results.Ok(result);
        });

        group.MapGet("/{id:guid}", async (Guid id, PaymentsDbContext db, CancellationToken ct) =>
        {
            var payment = await db.PaymentIntents.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct)
                ?? throw NotFoundException.For("giao dịch thanh toán", id);

            var webhooks = await db.ProcessedWebhooks.AsNoTracking()
                .Where(w => w.PaymentIntentId == id || w.OrderId == payment.OrderId)
                .OrderByDescending(w => w.ProcessedAt)
                .Take(50)
                .Select(w => new { w.Provider, w.TransactionId, w.Result, w.ProcessedAt })
                .ToListAsync(ct);

            var refunds = await db.PaymentRefunds.AsNoTracking()
                .Where(r => r.PaymentIntentId == id)
                .OrderByDescending(r => r.RequestedAt)
                .Select(r => new
                {
                    r.Id, r.Amount, channel = r.Channel.ToString(), status = r.Status.ToString(),
                    r.Reason, r.Reference, r.RequestedAt, r.ApprovedAt, r.CompletedAt, r.FailureReason
                })
                .ToListAsync(ct);

            return Results.Ok(new
            {
                payment = PaymentStatusResponse.From(payment),
                webhookTrail = webhooks,
                refunds
            });
        });
    }
}

public sealed record AdminPaymentListItem(
    Guid Id,
    Guid OrderId,
    decimal Amount,
    decimal AmountRefunded,
    string Status,
    string Provider,
    string? PaymentCode,
    string? ExternalId,
    string? ReconciliationReference,
    string Settlement,
    DateTime? ExpiresAt,
    DateTime? ConfirmedAt,
    DateTime CreatedAt);
