using BuildingBlocks.Documents;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Paging;
using BuildingBlocks.Repository;
using BuildingBlocks.Security;
using BuildingBlocks.Validation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using InventoryModule.Application.Purchasing;
using InventoryModule.Application.Stock;
using InventoryModule.Infrastructure;
using InventoryModule.Domain;

namespace InventoryModule;

/// <summary>
/// Phiếu nhập kho (GRN) — tạo / danh sách / chi tiết / huỷ.
/// Kiểm hàng và xác nhận nằm ở <see cref="InventoryModule.Endpoints.Purchasing.GrnInspectionEndpoints"/>.
///
/// <para>
/// W2-12: số chứng từ lấy từ <c>IDocumentNumberService</c> (bộ đếm tĩnh cũ khởi động lại từ 1 sau
/// mỗi lần deploy và đụng unique index thành 500), người nhận lấy từ JWT chứ không từ body, và
/// danh sách có phân trang + tên NCC/kho đã join sẵn.
/// </para>
/// </summary>
public static class GoodsReceivedNoteEndpoints
{
    public static void MapGoodsReceivedNoteEndpoints(this IEndpointRouteBuilder app)
    {
        // W1-10: phiếu nhập kho -> quyền theo verb của module Inventory.
        var group = app.MapGroup("/api/inventory/grn").RequireModulePermissions(PermissionModules.Inventory);

        // POST /api/inventory/grn — tạo phiếu nhập ở trạng thái nháp.
        group.MapPost("", async (
            CreateGRNDto dto, ClaimsPrincipal user, InventoryDbContext db,
            InventoryDocumentNumbers numbers, CancellationToken ct) =>
        {
            if (dto.SupplierId.HasValue)
                await PurchasingGuards.EnsureSupplierUsableAsync(db, dto.SupplierId.Value, ct: ct);
            if (dto.WarehouseId.HasValue)
                await PurchasingGuards.EnsureWarehouseUsableAsync(db, dto.WarehouseId.Value, ct: ct);

            if (dto.PurchaseOrderId.HasValue &&
                !await db.PurchaseOrders.AnyAsync(p => p.Id == dto.PurchaseOrderId.Value, ct))
                throw new RequestValidationException("purchaseOrderId", "Đơn mua hàng không tồn tại.");

            var grn = new GoodsReceivedNote
            {
                DocumentNumber = await numbers.NextAsync(DocumentNumberTypes.GoodsReceivedNote, ct),
                DocumentDate = dto.DocumentDate ?? DateTime.UtcNow,
                SupplierId = dto.SupplierId,
                WarehouseId = dto.WarehouseId,
                PurchaseOrderId = dto.PurchaseOrderId,
                // Người nhận hàng LUÔN từ phiên đăng nhập — body chỉ là gợi ý của client.
                ReceivedBy = PurchasingGuards.ResolveUserName(user),
                Notes = dto.Notes,
                Status = GRNStatus.Draft,
                Items = dto.Items.Select(i => new GRNItem
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    Quantity = i.Quantity,
                    UnitCost = i.UnitCost,
                    SerialNumbers = i.SerialNumbers
                }).ToList()
            };

            db.GoodsReceivedNotes.Add(grn);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/inventory/grn/{grn.Id}", new { grn.Id, grn.DocumentNumber, grn.Status });
        }).WithValidation<CreateGRNDto>();

        // GET /api/inventory/grn — danh sách phân trang, kèm tên NCC/kho.
        group.MapGet("", async (
            [AsParameters] PagedRequest request, string? status, Guid? supplierId, Guid? purchaseOrderId,
            InventoryDbContext db, CancellationToken ct) =>
        {
            var query = db.GoodsReceivedNotes.AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<GRNStatus>(status, true, out var s))
                query = query.Where(g => g.Status == s);
            if (supplierId.HasValue) query = query.Where(g => g.SupplierId == supplierId.Value);
            if (purchaseOrderId.HasValue) query = query.Where(g => g.PurchaseOrderId == purchaseOrderId.Value);

            var search = request.NormalizedSearch;
            if (search is not null)
                query = query.Where(g => g.DocumentNumber.Contains(search));

            return Results.Ok(await query
                .OrderByDescending(g => g.DocumentDate)
                .Select(g => new GrnListItemDto(
                    g.Id,
                    g.DocumentNumber,
                    g.DocumentDate,
                    g.SupplierId,
                    db.Suppliers.Where(x => x.Id == g.SupplierId).Select(x => x.Name).FirstOrDefault(),
                    g.WarehouseId,
                    db.Warehouses.Where(w => w.Id == g.WarehouseId).Select(w => w.Name).FirstOrDefault(),
                    g.PurchaseOrderId,
                    db.PurchaseOrders.Where(p => p.Id == g.PurchaseOrderId).Select(p => p.PONumber).FirstOrDefault(),
                    g.Status.ToString(),
                    g.Source.ToString(),
                    g.ReceivedBy,
                    g.Items.Count,
                    g.Items.Sum(i => i.Quantity * i.UnitCost)))
                .ToPagedResultAsync(request, ct));
        });

        // GET /api/inventory/grn/defective — phiếu có hàng lỗi, nguồn của phiếu trả NCC (IR w0-#39).
        group.MapGet("defective", async (InventoryDbContext db, CancellationToken ct) =>
        {
            var rows = await db.GoodsReceivedNotes
                .Where(g => g.Items.Any(i => i.RejectedQty > 0))
                .OrderByDescending(g => g.DocumentDate)
                .Take(200)
                .Select(g => new
                {
                    grnId = g.Id,
                    grnNumber = g.DocumentNumber,
                    supplierId = g.SupplierId,
                    supplierName = db.Suppliers.Where(x => x.Id == g.SupplierId).Select(x => x.Name).FirstOrDefault(),
                    status = g.Status.ToString(),
                    documentDate = g.DocumentDate,
                    rejectedItemCount = g.Items.Count(i => i.RejectedQty > 0),
                    rejectedQuantity = g.Items.Sum(i => i.RejectedQty)
                })
                .ToListAsync(ct);
            return Results.Ok(rows);
        });

        // GET /api/inventory/grn/{id} — chi tiết kèm dòng hàng.
        group.MapGet("{id:guid}", async (Guid id, InventoryDbContext db, CancellationToken ct) =>
        {
            var grn = await db.GoodsReceivedNotes
                .Include(g => g.Items)
                .FirstOrDefaultAsync(g => g.Id == id, ct)
                ?? throw NotFoundException.For("phiếu nhập kho", id);

            return Results.Ok(new
            {
                grn.Id,
                grn.DocumentNumber,
                grn.DocumentDate,
                grn.SupplierId,
                supplierName = await db.Suppliers.Where(x => x.Id == grn.SupplierId).Select(x => x.Name).FirstOrDefaultAsync(ct),
                grn.WarehouseId,
                warehouseName = await db.Warehouses.Where(w => w.Id == grn.WarehouseId).Select(w => w.Name).FirstOrDefaultAsync(ct),
                grn.PurchaseOrderId,
                purchaseOrderNumber = await db.PurchaseOrders.Where(p => p.Id == grn.PurchaseOrderId).Select(p => p.PONumber).FirstOrDefaultAsync(ct),
                status = grn.Status.ToString(),
                source = grn.Source.ToString(),
                grn.ReceivedBy,
                grn.Notes,
                grn.HasRejectedItems,
                grn.IsFullyInspected,
                items = grn.Items.Select(i => new
                {
                    i.Id,
                    itemId = i.Id,
                    i.ProductId,
                    i.ProductName,
                    i.Quantity,
                    i.UnitCost,
                    i.AcceptedQty,
                    i.RejectedQty,
                    i.RejectReason,
                    i.TargetWarehouseId,
                    i.SerialNumbers
                })
            });
        });

        // POST /api/inventory/grn/{id}/cancel
        group.MapPost("{id:guid}/cancel", async (Guid id, InventoryDbContext db, CancellationToken ct) =>
        {
            var grn = await db.GoodsReceivedNotes.FirstOrDefaultAsync(g => g.Id == id, ct)
                ?? throw NotFoundException.For("phiếu nhập kho", id);
            if (grn.Status == GRNStatus.Confirmed)
                throw new ConflictException("Không thể huỷ phiếu nhập đã xác nhận.");

            grn.Status = GRNStatus.Cancelled;
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { success = true, status = grn.Status.ToString() });
        });
    }
}

public record GrnListItemDto(
    Guid Id,
    string DocumentNumber,
    DateTime DocumentDate,
    Guid? SupplierId,
    string? SupplierName,
    Guid? WarehouseId,
    string? WarehouseName,
    Guid? PurchaseOrderId,
    string? PurchaseOrderNumber,
    string Status,
    string Source,
    string ReceivedBy,
    int ItemCount,
    decimal TotalCost);

public record CreateGRNDto(
    Guid? SupplierId,
    Guid? WarehouseId,
    Guid? PurchaseOrderId,
    string? ReceivedBy,
    DateTime? DocumentDate,
    string? Notes,
    List<CreateGRNItemDto> Items
);
public record CreateGRNItemDto(Guid ProductId, string ProductName, int Quantity, decimal UnitCost, string? SerialNumbers);

public record InspectItemDto(int AcceptedQty, int RejectedQty, string? Reason, Guid? TargetWarehouseId);
