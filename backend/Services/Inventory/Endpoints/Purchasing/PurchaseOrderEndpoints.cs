using BuildingBlocks.Documents;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Repository;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using Catalog.Infrastructure;
using InventoryModule.Application.Purchasing;
using InventoryModule.Application.Stock;
using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace InventoryModule.Endpoints.Purchasing;

/// <summary>
/// Đơn mua hàng (PO). Tách khỏi <c>InventoryEndpoints.cs</c> ở W2-5; W2-12 siết nội dung.
///
/// <para>
/// <c>PUT /api/inventory/po/{id}/receive</c> đã bị XOÁ và không quay lại: đó là đường nhận hàng
/// thứ hai — không ghi <c>StockMovement</c>, không đặt giá vốn (nên <c>AverageCost</c> đứng ở 0 và
/// COGS sai), không sinh serial. GRN là đường nhập kho duy nhất.
/// </para>
/// <para>
/// W2-12 thêm: phân trang + tên NCC đã join, số PO từ <c>IDocumentNumberService</c>, người tạo lấy
/// từ JWT (không bao giờ từ body), validate dòng hàng, và tiến độ nhận theo từng dòng.
/// </para>
/// </summary>
public sealed class PurchaseOrderEndpoints : IInventorySubmodule
{
    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/inventory")
            .RequireModulePermissions(PermissionModules.Inventory);

        group.MapGet("/po", async (
            [AsParameters] PagedRequest request, string? status, Guid? supplierId,
            InventoryDbContext db, CancellationToken ct) =>
        {
            var query = db.PurchaseOrders.AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<POStatus>(status, true, out var s))
                query = query.Where(p => p.Status == s);
            if (supplierId.HasValue) query = query.Where(p => p.SupplierId == supplierId.Value);

            var search = request.NormalizedSearch;
            if (search is not null) query = query.Where(p => p.PONumber.Contains(search));

            return Results.Ok(await query
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new PurchaseOrderListItemDto(
                    p.Id,
                    p.PONumber,
                    p.SupplierId,
                    db.Suppliers.Where(x => x.Id == p.SupplierId).Select(x => x.Name).FirstOrDefault(),
                    p.Status.ToString(),
                    p.TotalAmount,
                    p.IsUrgent,
                    p.CreatedAt,
                    p.ExpectedDeliveryDate,
                    p.Items.Count,
                    p.Items.Sum(i => i.Quantity),
                    p.Items.Sum(i => i.ReceivedQuantity)))
                .ToPagedResultAsync(request, ct));
        })
        .RequireAuthorization(Permissions.Inventory.ViewPurchaseOrder);

        group.MapGet("/po/{id:guid}", async (Guid id, InventoryDbContext db, CancellationToken ct) =>
        {
            var po = await db.PurchaseOrders.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id, ct)
                ?? throw NotFoundException.For("đơn mua hàng", id);

            return Results.Ok(new
            {
                po.Id,
                po.PONumber,
                po.SupplierId,
                supplierName = await db.Suppliers.Where(x => x.Id == po.SupplierId).Select(x => x.Name).FirstOrDefaultAsync(ct),
                status = po.Status.ToString(),
                po.TotalAmount,
                po.IsUrgent,
                po.CreatedByUserId,
                po.SubmittedBy,
                po.SubmittedAt,
                po.ApprovedBy,
                po.ApprovedAt,
                po.RejectedBy,
                po.RejectedAt,
                po.RejectionReason,
                po.RequisitionId,
                po.SupplierQuotationId,
                po.ExpectedDeliveryDate,
                items = po.Items.Select(i => new
                {
                    i.ProductId,
                    i.ProductName,
                    i.Quantity,
                    i.UnitPrice,
                    i.ReceivedQuantity,
                    i.OutstandingQuantity,
                    lineTotal = i.Quantity * i.UnitPrice
                })
            });
        })
        .RequireAuthorization(Permissions.Inventory.ViewPurchaseOrder);

        group.MapPost("/po", async (
            CreatePurchaseOrderDto dto, ClaimsPrincipal user, InventoryDbContext db,
            CatalogDbContext catalog, InventoryDocumentNumbers numbers, CancellationToken ct) =>
        {
            var userId = PurchasingGuards.RequireUserId(user);
            await PurchasingGuards.EnsureSupplierUsableAsync(db, dto.SupplierId, ct: ct);

            // Tên sản phẩm được CHỤP lên chứng từ: đổi tên trong catalog không được sửa đơn hàng cũ.
            var names = await new GoodsReceiptCatalogFacts(catalog)
                .LoadAsync(dto.Items.Select(i => i.ProductId).Distinct().ToList(), ct);
            var unknown = dto.Items.Where(i => !names.ContainsKey(i.ProductId)).Select(i => i.ProductId).Distinct().ToList();
            if (unknown.Count > 0)
                throw new RequestValidationException("items", $"Sản phẩm không tồn tại: {string.Join(", ", unknown)}.");

            var items = dto.Items
                .Select(i => new PurchaseOrderItem(i.ProductId, i.Quantity, i.UnitPrice, names[i.ProductId].Name))
                .ToList();

            var po = new PurchaseOrder(dto.SupplierId, items, userId, dto.IsUrgent ?? false);
            po.SetNumber(await numbers.NextAsync(DocumentNumberTypes.PurchaseOrder, ct));
            if (dto.ExpectedDeliveryDate.HasValue) po.SetExpectedDeliveryDate(dto.ExpectedDeliveryDate.Value);

            db.PurchaseOrders.Add(po);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/inventory/po/{po.Id}",
                new { po.Id, po.PONumber, status = po.Status.ToString(), po.TotalAmount });
        })
        .WithValidation<CreatePurchaseOrderDto>()
        .RequireAuthorization(Permissions.Inventory.CreatePurchaseOrder);

        group.MapPut("/po/{id:guid}/send", async (Guid id, InventoryDbContext db, CancellationToken ct) =>
        {
            var po = await db.PurchaseOrders.FirstOrDefaultAsync(p => p.Id == id, ct)
                ?? throw NotFoundException.For("đơn mua hàng", id);
            try { po.Send(); }
            catch (InvalidOperationException ex) { throw new DomainException(ex.Message); }
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { message = "Đã gửi đơn hàng", status = po.Status.ToString() });
        })
        .RequireAuthorization(Permissions.Inventory.CreatePurchaseOrder);

        group.MapPut("/po/{id:guid}/cancel", async (Guid id, InventoryDbContext db, CancellationToken ct) =>
        {
            var po = await db.PurchaseOrders.FirstOrDefaultAsync(p => p.Id == id, ct)
                ?? throw NotFoundException.For("đơn mua hàng", id);
            try { po.Cancel(); }
            catch (InvalidOperationException ex) { throw new DomainException(ex.Message); }
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { message = "Đã hủy đơn hàng", status = po.Status.ToString() });
        })
        .RequireAuthorization(Permissions.Inventory.CreatePurchaseOrder);
    }

}

public record PurchaseOrderListItemDto(
    Guid Id,
    string PONumber,
    Guid SupplierId,
    string? SupplierName,
    string Status,
    decimal TotalAmount,
    bool IsUrgent,
    DateTime CreatedAt,
    DateTime? ExpectedDeliveryDate,
    int LineCount,
    int OrderedQuantity,
    int ReceivedQuantity);

public record CreatePurchaseOrderDto(
    Guid SupplierId,
    List<CreatePOItemDto> Items,
    bool? IsUrgent = null,
    DateTime? ExpectedDeliveryDate = null);

public record CreatePOItemDto(Guid ProductId, int Quantity, decimal UnitPrice);
