using BuildingBlocks.Documents;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Repository;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using InventoryModule.Application.Purchasing;
using InventoryModule.Application.Stock;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;

namespace InventoryModule;

/// <summary>
/// Endpoint đề nghị mua (Purchase Requisition).
/// Nhân viên tạo → quản lý duyệt → chuyển thành PO gán NCC cụ thể.
/// AutoReorderService sinh PR loại Source="AutoReorder".
/// </summary>
public static class PurchaseRequisitionEndpoints
{
    public static void MapPurchaseRequisitionEndpoints(this IEndpointRouteBuilder app)
    {
        // W0-3: RequireAuthorization() trống ⇒ token Customer tạo/duyệt được đề nghị mua.
        // W1-10: đề nghị mua hàng -> GET ViewPurchaseOrder, POST CreatePurchaseOrder,
        // PUT/PATCH CreatePurchaseOrder, DELETE ApprovePurchaseOrder.
        var group = app.MapGroup("/api/inventory/purchase-requisitions")
            .RequireModulePermissions(PermissionModules.PurchaseOrders);

        // W2-12: phân trang chuẩn (docs/api-conventions.md §3) thay cho Take(500) không đếm tổng.
        group.MapGet("", async (
            [AsParameters] PagedRequest request, string? status, InventoryDbContext db, CancellationToken ct) =>
        {
            var query = db.PurchaseRequisitions.AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<PurchaseRequisitionStatus>(status, true, out var s))
                query = query.Where(p => p.Status == s);

            var search = request.NormalizedSearch;
            if (search is not null) query = query.Where(p => p.Number.Contains(search));

            return Results.Ok(await query
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    p.Number,
                    status = p.Status.ToString(),
                    urgency = p.Urgency.ToString(),
                    p.RequesterName,
                    requestedByName = p.RequesterName,
                    p.Reason,
                    p.CreatedAt,
                    itemCount = p.Items.Count,
                    totalQuantity = p.Items.Sum(i => i.Quantity)
                })
                .ToPagedResultAsync(request, ct));
        });

        group.MapGet("{id:guid}", async (Guid id, InventoryDbContext db) =>
        {
            var pr = await db.PurchaseRequisitions
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == id);
            return pr != null ? Results.Ok(pr) : Results.NotFound();
        });

        group.MapPost("", async (
            CreatePurchaseRequisitionDto dto, ClaimsPrincipal user, InventoryDbContext db,
            InventoryDocumentNumbers numbers, CancellationToken ct) =>
        {
            // Người đề nghị LUÔN từ JWT — body không được phép ký thay người khác.
            var userId = PurchasingGuards.RequireUserId(user);

            var items = dto.Items
                .Select(i => new PurchaseRequisitionItem(i.ProductId, i.ProductName, i.Quantity, i.Notes))
                .ToList();
            var pr = new PurchaseRequisition(userId, PurchasingGuards.ResolveUserName(user), items, dto.Urgency, dto.Reason);
            pr.SetNumber(await numbers.NextAsync(DocumentNumberTypes.PurchaseRequisition, ct));

            db.PurchaseRequisitions.Add(pr);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/inventory/purchase-requisitions/{pr.Id}",
                new { pr.Id, pr.Number, status = pr.Status.ToString() });
        }).WithValidation<CreatePurchaseRequisitionDto>();

        group.MapPost("{id:guid}/submit", async (Guid id, InventoryDbContext db) =>
        {
            var pr = await db.PurchaseRequisitions.FindAsync(id);
            if (pr == null) return Results.NotFound();
            try { pr.Submit(); await db.SaveChangesAsync(); return Results.Ok(pr); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
        });

        group.MapPost("{id:guid}/approve", async (Guid id, ClaimsPrincipal user, InventoryDbContext db) =>
        {
            var userId = ResolveUserId(user);
            if (userId == null) return Results.Unauthorized();
            var pr = await db.PurchaseRequisitions.FindAsync(id);
            if (pr == null) return Results.NotFound();
            // Chống tự duyệt: người đề nghị không được duyệt chính đề nghị của mình.
            if (pr.RequestedBy == userId.Value)
                throw new ForbiddenException("Người đề nghị không được tự duyệt đề nghị mua của mình.");
            try { pr.Approve(userId.Value); await db.SaveChangesAsync(); return Results.Ok(pr); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
        });

        group.MapPost("{id:guid}/reject", async (Guid id, RejectDto dto, ClaimsPrincipal user, InventoryDbContext db) =>
        {
            var userId = ResolveUserId(user);
            if (userId == null) return Results.Unauthorized();
            var pr = await db.PurchaseRequisitions.FindAsync(id);
            if (pr == null) return Results.NotFound();
            try { pr.Reject(userId.Value, dto.Reason); await db.SaveChangesAsync(); return Results.Ok(pr); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
        });

        group.MapPost("{id:guid}/convert-to-po", async (
            Guid id, ConvertPrToPoDto dto, ClaimsPrincipal user, InventoryDbContext db,
            InventoryDocumentNumbers numbers, CancellationToken ct) =>
        {
            var userId = PurchasingGuards.RequireUserId(user);
            await PurchasingGuards.EnsureSupplierUsableAsync(db, dto.SupplierId, ct: ct);

            var pr = await db.PurchaseRequisitions.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id, ct)
                ?? throw NotFoundException.For("đề nghị mua", id);

            try
            {
                var priceMap = dto.UnitPrices?.ToDictionary(p => p.ProductId, p => p.UnitPrice) ?? new();
                var po = pr.ConvertToPO(dto.SupplierId, userId, priceMap);
                po.SetNumber(await numbers.NextAsync(DocumentNumberTypes.PurchaseOrder, ct));
                db.PurchaseOrders.Add(po);
                await db.SaveChangesAsync(ct);
                return Results.Ok(new { poId = po.Id, poNumber = po.PONumber, totalAmount = po.TotalAmount });
            }
            catch (InvalidOperationException ex) { throw new DomainException(ClientSafeError.Message(ex)); }
        });

        group.MapPost("{id:guid}/cancel", async (Guid id, InventoryDbContext db) =>
        {
            var pr = await db.PurchaseRequisitions.FindAsync(id);
            if (pr == null) return Results.NotFound();
            try { pr.Cancel(); await db.SaveChangesAsync(); return Results.Ok(pr); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ClientSafeError.Message(ex) }); }
        });
    }

    private static Guid? ResolveUserId(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}

public record CreatePurchaseRequisitionDto(
    List<CreatePurchaseRequisitionItemDto> Items,
    UrgencyLevel Urgency,
    string? Reason);

public record CreatePurchaseRequisitionItemDto(Guid ProductId, string ProductName, int Quantity, string? Notes);
public record ConvertPrToPoDto(Guid SupplierId, List<UnitPriceDto>? UnitPrices);
public record UnitPriceDto(Guid ProductId, decimal UnitPrice);
public record RejectDto(string Reason);
