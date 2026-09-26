using System.Security.Claims;
using BuildingBlocks.Configuration;
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
/// Phía NHÂN VIÊN của báo giá: xem trước (tính tiền, không lưu), tạo, sửa dòng, gửi khách duyệt.
/// Mọi con số tiền đi qua <see cref="RepairQuoteCalculator"/>; frontend gọi <c>quote/preview</c>
/// để hiển thị tổng khi đang soạn thay vì tự cộng.
/// </summary>
public static class QuoteStaffEndpoints
{
    private const string ValidityDaysKey = "Repair.QuoteValidityDays";

    public static void MapQuoteStaffEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/repair").RequireAuthorization(SecurityPolicies.Authenticated);

        group.MapPost("/work-orders/{id:guid}/quote/preview", async (
            Guid id, [FromBody] UpsertQuoteRequest req, RepairDbContext db, RepairVatRateProvider vat, ClaimsPrincipal user, CancellationToken ct) =>
        {
            await LoadEditableWorkOrderAsync(db, user, id, ct);
            var drafts = await RepairQuoteDraftBuilder.BuildAsync(db, req, ct);
            var pricing = RepairQuoteCalculator.Calculate(drafts, req.DiscountAmount, await vat.CurrentRateAsync(ct));
            return Results.Ok(RepairQuoteDtoMapper.ToPreview(drafts, pricing));
        }).RequireAuthorization(Permissions.Repair.CreateQuote);

        group.MapPost("/work-orders/{id:guid}/quote", async (
            Guid id, [FromBody] UpsertQuoteRequest req, RepairDbContext db, RepairVatRateProvider vat,
            IAppSettings settings, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var workOrder = await LoadEditableWorkOrderAsync(db, user, id, ct);
            var drafts = await RepairQuoteDraftBuilder.BuildAsync(db, req, ct);
            var vatRate = await vat.CurrentRateAsync(ct);

            RepairQuote quote;
            try
            {
                quote = new RepairQuote(workOrder.Id, req.EstimatedHours, req.HourlyRate, req.Description, req.Notes,
                    settings.GetInt(ValidityDaysKey, RepairQuote.DefaultValidityDays));
                quote.ReplaceLines(drafts, req.DiscountAmount, vatRate);
                workOrder.CreateQuote(quote);
            }
            catch (InvalidOperationException)
            {
                throw new ConflictException("Chỉ lập báo giá khi phiếu đã chẩn đoán xong hoặc đang ở bước báo giá.");
            }
            catch (ArgumentException)
            {
                throw new RequestValidationException("estimatedHours", "Số giờ và đơn giá giờ công không được âm.");
            }

            db.RepairQuotes.Add(quote); // stage tường minh cả báo giá lẫn dòng (khoá Guid sinh sẵn)
            Log(db, workOrder, user, WorkOrderActivityLog.CreateQuoteGenerated(
                workOrder.Id, quote.QuoteNumber, quote.TotalCost, UserId(user), TechnicianAccess.GetUserName(user)));
            await db.SaveChangesAsync(ct);

            return Results.Ok(new
            {
                Message = "Quote created",
                QuoteId = quote.Id,
                quote.QuoteNumber,
                quote.TotalCost,
                quote.ValidUntil,
                Quote = RepairQuoteDtoMapper.ToDto(quote)
            });
        }).RequireAuthorization(Permissions.Repair.CreateQuote);

        group.MapPut("/quotes/{id:guid}", async (
            Guid id, [FromBody] UpsertQuoteRequest req, RepairDbContext db, RepairVatRateProvider vat, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var quote = await QuoteEndpoints.LoadAsync(db, id);
            if (!await RepairQuoteAccess.CanManageAsync(db, user, quote.WorkOrder!))
                return Results.Forbid();

            var drafts = await RepairQuoteDraftBuilder.BuildAsync(db, req, ct);
            var vatRate = await vat.CurrentRateAsync(ct);
            try
            {
                var oldLines = quote.Lines.ToList();
                quote.UpdateDetails(req.EstimatedHours, req.HourlyRate, req.Description, req.Notes);
                var newLines = quote.ReplaceLines(drafts, req.DiscountAmount, vatRate);
                db.RepairQuoteLines.RemoveRange(oldLines);
                db.RepairQuoteLines.AddRange(newLines);
            }
            catch (InvalidOperationException)
            {
                throw new ConflictException("Chỉ sửa được báo giá đang chờ khách duyệt.");
            }
            catch (ArgumentException)
            {
                throw new RequestValidationException("estimatedHours", "Số giờ và đơn giá giờ công không được âm.");
            }

            await db.SaveChangesAsync(ct);
            return Results.Ok(new { Message = "Quote updated", quote.TotalCost, Quote = RepairQuoteDtoMapper.ToDto(quote) });
        }).RequireAuthorization(Permissions.Repair.UpdateStatus);

        group.MapPut("/quotes/{id:guid}/await-approval", async (Guid id, RepairDbContext db, ClaimsPrincipal user) =>
        {
            var quote = await QuoteEndpoints.LoadAsync(db, id);
            var workOrder = quote.WorkOrder!;
            if (!await RepairQuoteAccess.CanManageAsync(db, user, workOrder))
                return Results.Forbid();

            try
            {
                workOrder.MarkAwaitingApproval();
            }
            catch (InvalidOperationException)
            {
                throw new ConflictException("Phiếu chưa có báo giá để gửi khách.");
            }

            Log(db, workOrder, user, WorkOrderActivityLog.CreateStatusChange(
                workOrder.Id, WorkOrderStatus.Quoted, WorkOrderStatus.AwaitingApproval,
                UserId(user), TechnicianAccess.GetUserName(user), "Đã gửi báo giá cho khách duyệt"));
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Quote sent for customer approval", WorkOrderStatus = workOrder.Status.ToString() });
        }).RequireAuthorization(Permissions.Repair.UpdateStatus);
    }

    private static async Task<WorkOrder> LoadEditableWorkOrderAsync(RepairDbContext db, ClaimsPrincipal user, Guid id, CancellationToken ct)
    {
        var workOrder = await db.WorkOrders.Include(w => w.Quotes).FirstOrDefaultAsync(w => w.Id == id, ct)
            ?? throw NotFoundException.For("phiếu sửa chữa", id);
        if (!await RepairQuoteAccess.CanManageAsync(db, user, workOrder))
            throw new ForbiddenException("Chỉ kỹ thuật viên được giao phiếu hoặc quản lý mới lập được báo giá.");
        return workOrder;
    }

    private static Guid? UserId(ClaimsPrincipal user) => TechnicianAccess.TryGetUserId(user, out var id) ? id : null;

    private static void Log(RepairDbContext db, WorkOrder workOrder, ClaimsPrincipal user, WorkOrderActivityLog log)
    {
        workOrder.AddActivityLog(log);
        db.WorkOrderActivityLogs.Add(log);
    }
}
