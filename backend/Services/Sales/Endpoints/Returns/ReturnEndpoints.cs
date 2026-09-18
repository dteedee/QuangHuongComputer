using System.Security.Claims;
using BuildingBlocks.Endpoints;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Application.Returns;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Endpoints.Returns;

/// <summary>
/// Đổi/trả phía KHÁCH — **W2-10** (`phase-48` bước 6).
///
/// Thay đổi so với bản trích nguyên văn:
///  · Yêu cầu mang <c>reasonCode</c> có cấu trúc (D08) thay vì chỉ một chuỗi tự do; mã lý do
///    quyết định hạn trả và mức khấu trừ nên không thể để khách gõ tay.
///  · Một dòng đơn chỉ có MỘT yêu cầu đang mở và KHÔNG BAO GIỜ được hoàn tiền lần hai
///    (chặn ở <see cref="ReturnOrchestrator.RequestAsync"/>).
///  · Lỗi nghiệp vụ ném <see cref="DomainException"/> nên đi qua đúng hợp đồng lỗi
///    (docs/api-conventions.md) thay vì <c>Results.BadRequest(new { Error = ... })</c> tự chế.
/// </summary>
internal static class ReturnEndpoints
{
    public static void MapReturnEndpoints(RouteGroupBuilder group, RouteGroupBuilder adminGroup)
    {
        group.MapPost("/returns", async (
            CreateReturnRequest dto,
            ReturnOrchestrator orchestrator,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.Reason))
                throw new RequestValidationException("reason", "Lý do đổi trả là bắt buộc.");

            var rr = await orchestrator.RequestAsync(new CreateReturnRequestInput(
                OrderId: dto.OrderId,
                OrderItemId: dto.OrderItemId,
                Type: dto.Type ?? ReturnType.Refund,
                Reason: dto.Reason,
                ReasonCode: dto.ReasonCode ?? ReturnReasonCode.ChangeOfMind,
                Description: dto.Description,
                AttachmentUrls: dto.AttachmentUrls,
                ExchangeProductId: dto.ExchangeProductId,
                ExchangeVariantId: dto.ExchangeVariantId), userId, ct);

            return Results.Created($"/api/sales/returns/{rr.Id}", new
            {
                rr.Id,
                rr.OrderId,
                Type = rr.Type.ToString(),
                Status = rr.Status.ToString(),
                rr.RefundAmount,
                Message = "Đã gửi yêu cầu đổi trả",
            });
        });

        group.MapGet("/returns", async (SalesDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var items = await db.ReturnRequests
                .Where(r => db.Orders.Any(o => o.Id == r.OrderId && o.CustomerId == userId))
                .OrderByDescending(r => r.RequestedAt)
                .Select(r => new
                {
                    r.Id,
                    r.OrderId,
                    r.OrderItemId,
                    r.Reason,
                    ReasonCode = EF.Property<int?>(r, "ReasonCode"),
                    r.Description,
                    Type = r.Type.ToString(),
                    Status = r.Status.ToString(),
                    r.RefundAmount,
                    r.RequestedAt,
                })
                .ToListAsync(ct);

            return Results.Ok(items);
        });

        group.MapGet("/returns/{id:guid}", async (
            Guid id, SalesDbContext db, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Results.Unauthorized();

            var row = await db.ReturnRequests
                .Where(r => r.Id == id)
                .Select(r => new
                {
                    r.Id,
                    r.OrderId,
                    r.OrderItemId,
                    r.Reason,
                    ReasonCode = EF.Property<int?>(r, "ReasonCode"),
                    r.Description,
                    Type = r.Type.ToString(),
                    Status = r.Status.ToString(),
                    r.RefundAmount,
                    r.RequestedAt,
                    r.ApprovedAt,
                    r.RejectedAt,
                    r.RejectionReason,
                    r.RefundedAt,
                    r.ProcessedBy,
                    OwnerId = db.Orders.Where(o => o.Id == r.OrderId).Select(o => o.CustomerId).FirstOrDefault(),
                })
                .FirstOrDefaultAsync(ct)
                ?? throw NotFoundException.For("yêu cầu đổi trả", id);

            // IDOR: yêu cầu của người khác không được lộ, kể cả nội dung tóm tắt.
            if (row.OwnerId != userId) throw new ForbiddenException();

            return Results.Ok(row);
        });
    }
}

/// <summary>
/// Yêu cầu đổi trả của khách. <c>ReasonCode</c> (D08) là trường quyết định chính sách; để trống
/// thì hệ thống hiểu là "đổi ý" — mức bảo vệ shop cao nhất, không bao giờ tự cho khách mức ưu đãi
/// của lý do luật định.
/// </summary>
public record CreateReturnRequest(
    Guid OrderId,
    Guid OrderItemId,
    string Reason,
    string? Description = null,
    ReturnReasonCode? ReasonCode = null,
    ReturnType? Type = null,
    string? AttachmentUrls = null,
    Guid? ExchangeProductId = null,
    Guid? ExchangeVariantId = null);
