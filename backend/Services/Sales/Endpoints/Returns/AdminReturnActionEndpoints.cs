using System.Security.Claims;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Endpoints.Returns;

/// <summary>
/// Thao tác trên một yêu cầu đổi trả: duyệt, từ chối, kiểm hàng, hoàn tất.
/// Tất cả đòi <c>Sales.ManageReturns</c> — ma trận W1-1 cố tình KHÔNG cấp quyền này cho Sale.
/// Tách khỏi phần truy vấn để mỗi file dưới 200 dòng.
/// </summary>
internal static partial class AdminReturnEndpoints
{
    private static void MapReturnActionEndpoints(RouteGroupBuilder adminGroup)
    {
        adminGroup.MapPost("/returns/{id:guid}/approve", async (Guid id, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var returnRequest = await db.ReturnRequests.FindAsync(id);
            if (returnRequest == null)
                return Results.NotFound(new { Error = "Return request not found" });

            if (returnRequest.Status != ReturnStatus.Pending)
                return Results.BadRequest(new { Error = "Only pending returns can be approved" });

            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var userId = !string.IsNullOrEmpty(userIdStr) && Guid.TryParse(userIdStr, out var uid) ? uid.ToString() : "System";

            returnRequest.Approve(userId);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Return request approved", Status = returnRequest.Status.ToString() });
            // W1-10: duyệt/từ chối/xử lý đổi-trả cần Sales.ManageReturns (Admin/Manager).
            // Ma trận W1-1 cố tình KHÔNG cấp quyền này cho Sale ("Sale không duyệt đổi/trả"),
            // nên không để rơi vào quyền Sales.ManageAll theo verb của group.
        }).RequireAuthorization(Permissions.Sales.ManageReturns);

        adminGroup.MapPost("/returns/{id:guid}/reject", async (Guid id, RejectReturnDto dto, SalesDbContext db, ClaimsPrincipal user) =>
        {
            var returnRequest = await db.ReturnRequests.FindAsync(id);
            if (returnRequest == null)
                return Results.NotFound(new { Error = "Return request not found" });

            if (returnRequest.Status != ReturnStatus.Pending)
                return Results.BadRequest(new { Error = "Only pending returns can be rejected" });

            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var userId = !string.IsNullOrEmpty(userIdStr) && Guid.TryParse(userIdStr, out var uid) ? uid.ToString() : "System";

            returnRequest.Reject(dto.Reason, userId);
            await db.SaveChangesAsync();

            return Results.Ok(new { Message = "Return request rejected", Status = returnRequest.Status.ToString() });
        }).RequireAuthorization(Permissions.Sales.ManageReturns);

        // Phase 07: Inspect — nhân viên kiểm hàng nhận về, chọn kho nhập.
        adminGroup.MapPost("/returns/{id:guid}/inspect", async (
            Guid id,
            [FromBody] InspectReturnDto dto,
            SalesDbContext db,
            ClaimsPrincipal user) =>
        {
            var rr = await db.ReturnRequests.FindAsync(id);
            if (rr == null) return Results.NotFound(new { Error = "Return request not found" });

            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdStr, out var uid)) uid = Guid.Empty;
            try
            {
                rr.RecordInspection(dto.Condition, dto.WarehouseId, uid, dto.Notes);
                await db.SaveChangesAsync();
                return Results.Ok(new { Message = "Đã kiểm hàng", rr.Id, rr.Status, rr.ReceivedCondition, rr.RestockWarehouseId });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ClientSafeError.Message(ex) }); }
        }).RequireAuthorization(Permissions.Sales.ManageReturns);

        // Phase 07: Complete — chạy Orchestrator (Refund/Exchange/Replace), nhập kho, hoàn tiền/đơn mới.
        adminGroup.MapPost("/returns/{id:guid}/complete", async (
            Guid id,
            Sales.Application.Returns.ReturnOrchestrator orchestrator,
            ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var processedBy = !string.IsNullOrEmpty(userIdStr) ? userIdStr : "system";
            try
            {
                var result = await orchestrator.ProcessAfterInspectionAsync(id, processedBy);
                return Results.Ok(new { Message = "Đã hoàn tất yêu cầu", result });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ClientSafeError.Message(ex) }); }
        }).RequireAuthorization(Permissions.Sales.ManageReturns);

        // Legacy /refund alias — điều hướng qua Complete cho tương thích cũ.
        adminGroup.MapPost("/returns/{id:guid}/refund", async (
            Guid id,
            Sales.Application.Returns.ReturnOrchestrator orchestrator,
            ClaimsPrincipal user) =>
        {
            var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var processedBy = !string.IsNullOrEmpty(userIdStr) ? userIdStr : "system";
            try
            {
                var result = await orchestrator.ProcessAfterInspectionAsync(id, processedBy);
                return Results.Ok(new { Message = "Return request refunded", Status = "Completed", result });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { Error = ClientSafeError.Message(ex) }); }
        }).RequireAuthorization(Permissions.Sales.ManageReturns);
    }
}
