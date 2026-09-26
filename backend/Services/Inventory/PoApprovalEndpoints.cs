using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using BuildingBlocks.Security;
using InventoryModule.Application.Purchasing;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using BuildingBlocks.Endpoints;

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
        // W0-3: RequireAuthorization() trống ⇒ token Customer duyệt được PO cần Manager.
        // W1-10: danh sách role ProcurementRoles (Admin/Manager/InventoryStaff) đã bị xoá —
        // GET -> Inventory.ViewPurchaseOrder, POST -> Inventory.CreatePurchaseOrder
        // (duyệt/từ chối khai báo riêng ApprovePurchaseOrder bên dưới).
        var group = app.MapGroup("/api/inventory")
            .RequireModulePermissions(PermissionModules.PurchaseOrders);

        group.MapPost("/po/{id:guid}/submit", async (Guid id, ClaimsPrincipal user, PoApprovalService svc) =>
        {
            var userId = ResolveUserId(user);
            if (userId == null) return Results.Unauthorized();
            try
            {
                var req = await svc.SubmitForApprovalAsync(id, userId.Value);
                return Results.Ok(new { approvalRequestId = req.Id, requiredRole = req.RequiredRole, amount = req.Amount });
            }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
        });

        group.MapPost("/po/{id:guid}/approve", async (Guid id, ClaimsPrincipal user, PoApprovalService svc) =>
        {
            var userId = ResolveUserId(user);
            if (userId == null) return Results.Unauthorized();
            try
            {
                // Truyền cả ClaimsPrincipal: service tự kiểm role bắt buộc của hạn mức (không tin endpoint).
                await svc.ApproveAsync(id, userId.Value, user);
                return Results.Ok(new { message = "Đã duyệt PO." });
            }
            catch (UnauthorizedAccessException ex) { return Results.Json(new { error = ClientSafeError.Message(ex) }, statusCode: StatusCodes.Status403Forbidden); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
            // W1-10: duyệt PO -> Inventory.ApprovePurchaseOrder (InventoryStaff KHÔNG có quyền này).
            // Kiểm tra role bắt buộc theo hạn mức vẫn do PoApprovalService làm thêm một lớp nữa.
        }).RequireAuthorization(Permissions.Inventory.ApprovePurchaseOrder);

        group.MapPost("/po/{id:guid}/reject", async (Guid id, RejectPoDto dto, ClaimsPrincipal user, PoApprovalService svc) =>
        {
            var userId = ResolveUserId(user);
            if (userId == null) return Results.Unauthorized();
            try
            {
                await svc.RejectAsync(id, userId.Value, dto.Reason, user);
                return Results.Ok(new { message = "Đã từ chối PO." });
            }
            catch (UnauthorizedAccessException ex) { return Results.Json(new { error = ClientSafeError.Message(ex) }, statusCode: StatusCodes.Status403Forbidden); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
        }).RequireAuthorization(Permissions.Inventory.ApprovePurchaseOrder);

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
                                     supplierName = db.Suppliers.Where(x => x.Id == po.SupplierId)
                                         .Select(x => x.Name).FirstOrDefault(),
                                     totalAmount = po.TotalAmount,
                                     requiredRole = req.RequiredRole,
                                     submittedBy = req.RequestedBy,
                                     submittedAt = req.CreatedAt,
                                     isUrgent = po.IsUrgent
                                 })
                                 .ToListAsync();

            // IR đợt 0 #50: danh sách chỉ trả GUID người gửi nên cột "người gửi" luôn trống.
            // Identity nằm trong CÙNG CSDL nhưng ở DbContext khác và Inventory không tham chiếu
            // module đó — đọc tên qua một truy vấn thô theo đúng cách LandedCostAllocator đọc
            // Catalog.Products.
            var names = await SubmitterNamesAsync(db, pending.Select(p => p.submittedBy).Distinct().ToList());

            return Results.Ok(pending.Select(p => new
            {
                p.approvalRequestId,
                p.poId,
                p.poNumber,
                p.supplierId,
                p.supplierName,
                p.totalAmount,
                p.requiredRole,
                p.submittedBy,
                submittedByName = names.TryGetValue(p.submittedBy, out var name) ? name : null,
                createdByName = names.TryGetValue(p.submittedBy, out var alias) ? alias : null,
                p.submittedAt,
                p.isUrgent
            }));
        });

        // === CRUD POApprovalRule (chỉ Admin) ===
        // W1-10: System.ManageConfig — trong ma trận W1-1 chỉ Admin giữ quyền này
        // (Manager chỉ có System.ViewConfig), tức giữ nguyên phạm vi "chỉ Admin" như trước.
        var ruleGroup = app.MapGroup("/api/inventory/po-approval-rules")
            .RequirePermission(Permissions.System.ManageConfig);

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
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
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
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
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


    /// <summary>
    /// Tên hiển thị của người gửi duyệt (IR đợt 0 #50). Dùng ADO trực tiếp trên connection của
    /// DbContext: bảng <c>AspNetUsers</c> thuộc module Identity, Inventory không tham chiếu tới nó.
    /// </summary>
    private static async Task<Dictionary<Guid, string>> SubmitterNamesAsync(
        InventoryDbContext db, List<Guid> userIds)
    {
        var result = new Dictionary<Guid, string>();
        if (userIds.Count == 0) return result;

        var connection = db.Database.GetDbConnection();
        var opened = connection.State != System.Data.ConnectionState.Open;
        if (opened) await connection.OpenAsync();
        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT \"Id\", COALESCE(NULLIF(\"FullName\", ''), \"Email\", \"UserName\") " +
                "FROM \"AspNetUsers\" WHERE \"Id\" = ANY(@ids)";
            var parameter = command.CreateParameter();
            parameter.ParameterName = "ids";
            parameter.Value = userIds.ToArray();
            command.Parameters.Add(parameter);

            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                if (!reader.IsDBNull(1)) result[reader.GetGuid(0)] = reader.GetString(1);
            }
        }
        catch (Exception)
        {
            // Tên hiển thị là thông tin phụ: thiếu nó thì danh sách duyệt vẫn phải chạy.
            return result;
        }
        finally
        {
            if (opened) await connection.CloseAsync();
        }

        return result;
    }

    private static Guid? ResolveUserId(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}

public record RejectPoDto(string Reason);
public record CreateApprovalRuleDto(string Name, decimal MinAmount, decimal MaxAmount, string RequiredRole, int SortOrder);
