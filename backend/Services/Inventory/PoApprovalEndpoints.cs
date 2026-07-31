using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using InventoryModule.Application.Purchasing;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;

namespace InventoryModule;

/// <summary>
/// Endpoint quản lý duyệt PO nhiều cấp:
///  - POST /api/inventory/po/{id}/submit — gửi duyệt
///  - GET  /api/inventory/po-approvals — danh sách chờ duyệt của tôi
///  - POST /api/inventory/po/{id}/approve — duyệt
///  - POST /api/inventory/po/{id}/reject  — từ chối kèm lý do
///  - CRUD /api/inventory/po-approval-rules — hạn mức
/// </summary>
public static class PoApprovalEndpoints
{
    public static void MapPoApprovalEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory").RequireAuthorization();

        group.MapPost("/po/{id:guid}/submit", async (Guid id, ClaimsPrincipal user, PoApprovalService svc) =>
        {
            var userId = ResolveUserId(user);
            if (userId == null) return Results.Unauthorized();
            try
            {
                var req = await svc.SubmitForApprovalAsync(id, userId.Value);
                return Results.Ok(new { approvalRequestId = req.Id, requiredRole = req.RequiredRole, amount = req.Amount });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("/po/{id:guid}/approve", async (Guid id, ClaimsPrincipal user, PoApprovalService svc) =>
        {
            var userId = ResolveUserId(user);
            if (userId == null) return Results.Unauthorized();
            try
            {
                await svc.ApproveAsync(id, userId.Value);
                return Results.Ok(new { message = "Đã duyệt PO." });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("/po/{id:guid}/reject", async (Guid id, RejectPoDto dto, ClaimsPrincipal user, PoApprovalService svc) =>
        {
            var userId = ResolveUserId(user);
            if (userId == null) return Results.Unauthorized();
            try
            {
                await svc.RejectAsync(id, userId.Value, dto.Reason);
                return Results.Ok(new { message = "Đã từ chối PO." });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        // Đơn PO đang chờ duyệt — lọc theo role người dùng.
        group.MapGet("/po-approvals/pending", async (ClaimsPrincipal user, InventoryDbContext db) =>
        {
            var userRoles = user.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
            if (userRoles.Count == 0) return Results.Ok(Array.Empty<object>());

            var pending = await (from req in db.POApprovalRequests
                                 join po in db.PurchaseOrders on req.PurchaseOrderId equals po.Id
                                 where req.Decision == POApprovalDecision.Pending
                                     && userRoles.Contains(req.RequiredRole)
                                 orderby req.CreatedAt descending
                                 select new
                                 {
                                     approvalRequestId = req.Id,
                                     poId = po.Id,
                                     poNumber = po.PONumber,
                                     supplierId = po.SupplierId,
                                     totalAmount = po.TotalAmount,
                                     requiredRole = req.RequiredRole,
                                     submittedBy = req.RequestedBy,
                                     submittedAt = req.CreatedAt,
                                     isUrgent = po.IsUrgent
                                 })
                                 .ToListAsync();
            return Results.Ok(pending);
        });

        // === CRUD POApprovalRule (chỉ Admin) ===
        var ruleGroup = app.MapGroup("/api/inventory/po-approval-rules")
            .RequireAuthorization(p => p.RequireRole("Admin"));

        ruleGroup.MapGet("", async (InventoryDbContext db) =>
        {
            var rules = await db.POApprovalRules.OrderBy(r => r.SortOrder).ToListAsync();
            return Results.Ok(rules);
        });

        ruleGroup.MapPost("", async (CreateApprovalRuleDto dto, InventoryDbContext db) =>
        {
            try
            {
                var rule = new POApprovalRule(dto.Name, dto.MinAmount, dto.MaxAmount, dto.RequiredRole, dto.SortOrder);
                db.POApprovalRules.Add(rule);
                await db.SaveChangesAsync();
                return Results.Created($"/api/inventory/po-approval-rules/{rule.Id}", rule);
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        ruleGroup.MapPut("{id:guid}", async (Guid id, CreateApprovalRuleDto dto, InventoryDbContext db) =>
        {
            var rule = await db.POApprovalRules.FindAsync(id);
            if (rule == null) return Results.NotFound();
            try
            {
                rule.Update(dto.Name, dto.MinAmount, dto.MaxAmount, dto.RequiredRole, dto.SortOrder);
                await db.SaveChangesAsync();
                return Results.Ok(rule);
            }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        ruleGroup.MapDelete("{id:guid}", async (Guid id, InventoryDbContext db) =>
        {
            var rule = await db.POApprovalRules.FindAsync(id);
            if (rule == null) return Results.NotFound();
            rule.IsActive = false;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    private static Guid? ResolveUserId(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}

public record RejectPoDto(string Reason);
public record CreateApprovalRuleDto(string Name, decimal MinAmount, decimal MaxAmount, string RequiredRole, int SortOrder);
