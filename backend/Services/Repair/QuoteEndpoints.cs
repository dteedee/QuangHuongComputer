using System.Security.Claims;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Repair.Application.Quotes;
using Repair.Domain;
using Repair.Infrastructure;

namespace Repair;

/// <summary>
/// Phía KHÁCH của báo giá: xem (kèm từng dòng + VAT), đồng ý, từ chối. Chỉ chủ phiếu được
/// duyệt/từ chối, và chỉ báo giá HIỆN HÀNH của phiếu (<c>WorkOrder.CurrentQuoteId</c>). Phần soạn
/// báo giá của nhân viên nằm ở <see cref="QuoteStaffEndpoints"/>.
/// </summary>
public static class QuoteEndpoints
{
    public static void MapQuoteEndpoints(this IEndpointRouteBuilder app)
    {
        // W1-10: nhánh khách hàng -> chỉ cần đăng nhập; handler tự lọc theo chủ phiếu.
        var group = app.MapGroup("/api/repair").RequireAuthorization(SecurityPolicies.Authenticated);
        app.MapQuoteStaffEndpoints();

        group.MapGet("/quotes/{id:guid}", async (Guid id, RepairDbContext db, ClaimsPrincipal user) =>
        {
            if (!TechnicianAccess.TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var quote = await LoadAsync(db, id);
            if (!RepairQuoteAccess.IsRepairStaff(user) && quote.WorkOrder!.CustomerId != userId)
                return Results.Forbid();

            if (quote.IsExpired() && quote.Status == QuoteStatus.Pending)
            {
                quote.MarkAsExpired();
                await db.SaveChangesAsync();
            }

            return Results.Ok(RepairQuoteDtoMapper.ToDto(quote));
        });

        group.MapPut("/quotes/{id:guid}/approve", async (Guid id, RepairDbContext db, ClaimsPrincipal user) =>
        {
            if (!TechnicianAccess.TryGetUserId(user, out var userId))
                return Results.Unauthorized();

            var quote = await LoadAsync(db, id);
            var workOrder = quote.WorkOrder!;
            if (workOrder.CustomerId != userId)
                return Results.Forbid();
            EnsureCurrent(workOrder, quote);

            try
            {
                var previous = workOrder.Status;
                quote.Approve();
                workOrder.ApproveQuote(quote.TotalCost);
                Log(db, workOrder, previous, userId, user, $"Khách đồng ý báo giá {quote.QuoteNumber}");
                await db.SaveChangesAsync();
            }
            catch (InvalidOperationException)
            {
                throw new ConflictException("Báo giá đã hết hạn hoặc không còn chờ duyệt.");
            }

            return Results.Ok(new { Message = "Quote approved", QuoteStatus = quote.Status.ToString(), WorkOrderStatus = workOrder.Status.ToString() });
        });

        group.MapPut("/quotes/{id:guid}/reject", async (Guid id, [FromBody] RejectQuoteDto dto, RepairDbContext db, ClaimsPrincipal user) =>
        {
            if (!TechnicianAccess.TryGetUserId(user, out var userId))
                return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(dto.Reason))
                throw new RequestValidationException("reason", "Vui lòng cho biết lý do từ chối.");

            var quote = await LoadAsync(db, id);
            var workOrder = quote.WorkOrder!;
            if (workOrder.CustomerId != userId)
                return Results.Forbid();
            EnsureCurrent(workOrder, quote);

            try
            {
                var previous = workOrder.Status;
                quote.Reject(dto.Reason);
                workOrder.RejectQuote();
                Log(db, workOrder, previous, userId, user, $"Khách từ chối báo giá {quote.QuoteNumber}: {dto.Reason}");
                await db.SaveChangesAsync();
            }
            catch (InvalidOperationException)
            {
                throw new ConflictException("Báo giá không còn chờ duyệt.");
            }

            return Results.Ok(new { Message = "Quote rejected", QuoteStatus = quote.Status.ToString(), WorkOrderStatus = workOrder.Status.ToString() });
        });
    }

    internal static async Task<RepairQuote> LoadAsync(RepairDbContext db, Guid id)
        => await db.RepairQuotes.Include(q => q.WorkOrder).Include(q => q.Lines).FirstOrDefaultAsync(q => q.Id == id)
           ?? throw NotFoundException.For("báo giá", id);

    private static void EnsureCurrent(WorkOrder workOrder, RepairQuote quote)
    {
        if (workOrder.CurrentQuoteId != quote.Id)
            throw new ConflictException("Báo giá này đã được thay bằng báo giá mới hơn.");
    }

    /// <summary>Stage log tường minh — xem ghi chú đồng thời trên WorkOrder.AddActivityLog.</summary>
    private static void Log(RepairDbContext db, WorkOrder workOrder, WorkOrderStatus previous, Guid userId, ClaimsPrincipal user, string text)
    {
        var log = WorkOrderActivityLog.CreateStatusChange(
            workOrder.Id, previous, workOrder.Status, userId, user.FindFirstValue(ClaimTypes.Name) ?? "Khách hàng", text);
        workOrder.AddActivityLog(log);
        db.WorkOrderActivityLogs.Add(log);
    }
}
