using System.Linq.Expressions;
using System.Security.Claims;
using BuildingBlocks.Paging;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Payments.Application.Refunds;
using Payments.Domain;
using Payments.Infrastructure;

namespace Payments.Endpoints.Admin;

/// <summary>
/// D04 mục 4 — hàng đợi hoàn tiền, quyền `Payments.Refund`.
///
/// Không cổng nào ở phạm vi ra mắt có API hoàn tiền, nên đây là nơi kế toán làm việc thật:
/// tạo phiếu → duyệt → chuyển khoản/trả tiền mặt → nhập mã tham chiếu. Chỉ khi có mã tham chiếu thì
/// khoản mới được ghi là đã hoàn — "đã hoàn" mà không có bằng chứng là chỗ tiền biến mất.
/// </summary>
public static class PaymentAdminRefundEndpoints
{
    public static void MapPaymentAdminRefundEndpoints(this RouteGroupBuilder admin)
    {
        var group = admin.MapGroup("/refunds").RequireAuthorization(Permissions.Payments.Refund);

        group.MapGet("", async (
            [AsParameters] PagedRequest paging,
            string? status,
            PaymentsDbContext db,
            CancellationToken ct) =>
        {
            var query = db.PaymentRefunds.AsQueryable();
            if (Enum.TryParse<RefundStatus>(status, ignoreCase: true, out var parsed))
                query = query.Where(r => r.Status == parsed);

            var sortable = new Dictionary<string, Expression<Func<PaymentRefund, object?>>>
            {
                ["requestedAt"] = r => r.RequestedAt,
                ["amount"] = r => r.Amount,
                ["status"] = r => r.Status
            };

            var result = await query
                .ApplySort(paging, sortable, r => r.RequestedAt)
                .Select(r => new AdminRefundListItem(
                    r.Id, r.PaymentIntentId, r.OrderId, r.Amount, r.Channel.ToString(), r.Status.ToString(),
                    r.Reason, r.Reference, r.RequestedAt, r.ApprovedAt, r.CompletedAt, r.FailureReason))
                .ToPagedResultAsync(paging, ct);

            return Results.Ok(result);
        });

        group.MapPost("", async (
            CreateRefundDto model,
            ClaimsPrincipal user,
            PaymentRefundService refunds,
            CancellationToken ct) =>
        {
            var refund = await refunds.RequestAsync(
                model.PaymentId, model.Amount, ParseChannel(model.Channel), model.Reason,
                user.UserId(), model.IdempotencyKey ?? $"manual:{Guid.NewGuid():N}", ct);
            return Results.Ok(Map(refund));
        }).WithValidation<CreateRefundDto>();

        group.MapPost("/{refundId:guid}/approve", async (
            Guid refundId, ClaimsPrincipal user, PaymentRefundService refunds, CancellationToken ct) =>
            Results.Ok(Map(await refunds.ApproveAsync(refundId, user.UserId(), ct))));

        group.MapPost("/{refundId:guid}/complete", async (
            Guid refundId, CompleteRefundDto model, PaymentRefundService refunds, CancellationToken ct) =>
            Results.Ok(Map(await refunds.CompleteAsync(refundId, model.Reference, ParseChannel(model.Channel), ct))))
            .WithValidation<CompleteRefundDto>();

        group.MapPost("/{refundId:guid}/reject", async (
            Guid refundId, RejectRefundDto model, PaymentRefundService refunds, CancellationToken ct) =>
            Results.Ok(Map(await refunds.RejectAsync(refundId, model.Reason, ct))));
    }

    private static RefundChannel ParseChannel(string? value)
        => Enum.TryParse<RefundChannel>(value, ignoreCase: true, out var parsed) ? parsed : RefundChannel.ManualTransfer;

    private static object Map(PaymentRefund r) => new
    {
        r.Id,
        r.PaymentIntentId,
        r.OrderId,
        r.Amount,
        channel = r.Channel.ToString(),
        status = r.Status.ToString(),
        r.Reason,
        r.Reference,
        r.RequestedAt,
        r.ApprovedAt,
        r.CompletedAt,
        r.FailureReason
    };
}

public sealed record AdminRefundListItem(
    Guid Id,
    Guid PaymentIntentId,
    Guid OrderId,
    decimal Amount,
    string Channel,
    string Status,
    string Reason,
    string? Reference,
    DateTime RequestedAt,
    DateTime? ApprovedAt,
    DateTime? CompletedAt,
    string? FailureReason);

public sealed record CreateRefundDto(
    Guid PaymentId, decimal Amount, string Reason, string? Channel = null, string? IdempotencyKey = null);

public sealed record CompleteRefundDto(string Reference, string? Channel = null);

public sealed record RejectRefundDto(string Reason);
