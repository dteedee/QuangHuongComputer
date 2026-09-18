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
using InventoryModule.Domain;
using InventoryModule.Infrastructure;

namespace InventoryModule;

/// <summary>
/// Endpoint phiếu trả hàng NCC.
/// Phần lớn được sinh tự động khi GRN kiểm hàng thấy lỗi;
/// có thể tạo tay khi phát hiện lỗi sau khi đã nhập kho.
/// </summary>
public static class PurchaseReturnEndpoints
{
    public static void MapPurchaseReturnEndpoints(this IEndpointRouteBuilder app)
    {
        // W0-3: trả hàng NCC ghi giảm tồn + công nợ ⇒ chỉ nhân viên kho/quản lý.
        // W1-10: trả hàng nhà cung cấp -> quyền theo verb của nhóm mua hàng.
        var group = app.MapGroup("/api/inventory/purchase-returns")
            .RequireModulePermissions(PermissionModules.PurchaseOrders);

        group.MapGet("", async (
            [AsParameters] PagedRequest request, string? status, Guid? supplierId,
            InventoryDbContext db, CancellationToken ct) =>
        {
            var query = db.PurchaseReturns.AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<PurchaseReturnStatus>(status, true, out var s))
                query = query.Where(p => p.Status == s);
            if (supplierId.HasValue) query = query.Where(p => p.SupplierId == supplierId.Value);

            var search = request.NormalizedSearch;
            if (search is not null) query = query.Where(p => p.Number.Contains(search));

            return Results.Ok(await query
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    p.Number,
                    p.GRNId,
                    grnNumber = db.GoodsReceivedNotes.Where(g => g.Id == p.GRNId).Select(g => g.DocumentNumber).FirstOrDefault(),
                    p.PurchaseOrderId,
                    p.SupplierId,
                    supplierName = db.Suppliers.Where(x => x.Id == p.SupplierId).Select(x => x.Name).FirstOrDefault(),
                    status = p.Status.ToString(),
                    total = p.TotalValue,
                    p.RefundAmount,
                    p.ReturnDate,
                    p.CreatedAt,
                    itemCount = p.Items.Count
                })
                .ToPagedResultAsync(request, ct));
        });

        group.MapGet("{id:guid}", async (Guid id, InventoryDbContext db) =>
        {
            var pr = await db.PurchaseReturns.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            return pr != null ? Results.Ok(pr) : Results.NotFound();
        });

        group.MapPost("", async (
            CreatePurchaseReturnDto dto, InventoryDbContext db,
            InventoryDocumentNumbers numbers, CancellationToken ct) =>
        {
            await PurchasingGuards.EnsureSupplierUsableAsync(db, dto.SupplierId, ct: ct);
            if (dto.GRNId.HasValue && !await db.GoodsReceivedNotes.AnyAsync(g => g.Id == dto.GRNId.Value, ct))
                throw new RequestValidationException("grnId", "Phiếu nhập không tồn tại.");

            var items = dto.Items.Select(i => new PurchaseReturnItem(
                i.ProductId, i.ProductName, i.Quantity, i.UnitCost, i.Reason, i.SerialNumbers)).ToList();
            var ret = new PurchaseReturn(dto.SupplierId, items, dto.GRNId, dto.PurchaseOrderId, dto.Notes);
            ret.SetNumber(await numbers.NextAsync(DocumentNumberTypes.ReturnRequest, ct));

            db.PurchaseReturns.Add(ret);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/inventory/purchase-returns/{ret.Id}",
                new { ret.Id, ret.Number, status = ret.Status.ToString(), total = ret.TotalValue });
        }).WithValidation<CreatePurchaseReturnDto>();

        group.MapPost("{id:guid}/confirm", async (Guid id, InventoryDbContext db) =>
        {
            var ret = await db.PurchaseReturns.FindAsync(id);
            if (ret == null) return Results.NotFound();
            try { ret.Confirm(); await db.SaveChangesAsync(); return Results.Ok(ret); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("{id:guid}/accept", async (Guid id, InventoryDbContext db) =>
        {
            var ret = await db.PurchaseReturns.FindAsync(id);
            if (ret == null) return Results.NotFound();
            try { ret.Accept(); await db.SaveChangesAsync(); return Results.Ok(ret); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("{id:guid}/accept-refund", async (Guid id, AcceptRefundDto dto, InventoryDbContext db) =>
        {
            var ret = await db.PurchaseReturns.FindAsync(id);
            if (ret == null) return Results.NotFound();
            // FE (api/inventory.ts purchaseReturnApi.acceptRefund) gửi {amount}; giữ cả hai tên để
            // không im lặng hoàn 0đ khi client cũ gọi.
            var refund = dto.RefundAmount ?? dto.Amount
                ?? throw new RequestValidationException("refundAmount", "Phải nhập số tiền hoàn.");
            try { ret.MarkRefunded(refund); await db.SaveChangesAsync(); return Results.Ok(ret); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
            catch (ArgumentException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });

        group.MapPost("{id:guid}/cancel", async (Guid id, InventoryDbContext db) =>
        {
            var ret = await db.PurchaseReturns.FindAsync(id);
            if (ret == null) return Results.NotFound();
            try { ret.Cancel(); await db.SaveChangesAsync(); return Results.Ok(ret); }
            catch (InvalidOperationException ex) { return Results.BadRequest(new { error = ex.Message }); }
        });
    }
}

public record CreatePurchaseReturnDto(
    Guid SupplierId,
    Guid? GRNId,
    Guid? PurchaseOrderId,
    string? Notes,
    List<CreatePurchaseReturnItemDto> Items);

public record CreatePurchaseReturnItemDto(
    Guid ProductId,
    string ProductName,
    int Quantity,
    decimal UnitCost,
    string? Reason,
    string? SerialNumbers);

public record AcceptRefundDto(decimal? RefundAmount, decimal? Amount);
