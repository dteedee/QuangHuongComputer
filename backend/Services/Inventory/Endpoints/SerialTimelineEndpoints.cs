using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;
using InventoryModule.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace InventoryModule.Endpoints;

/// <summary>
/// <c>GET /api/inventory/serials/{serial}/timeline</c> — dòng thời gian trọn đời của một chiếc máy:
/// nhập (PO/GRN) → bán → sửa chữa → bảo hành → trả lại (W2-5 bước 8).
///
/// <para>
/// Mỗi nguồn hạ nguồn được đọc riêng và độc lập: module nào chưa có bản ghi thì bỏ qua mục đó,
/// module nào đọc lỗi thì lỗi được LOG (xem <see cref="SerialTimelineQueries"/>) chứ không bị nuốt.
/// Phần tồn kho (nhập, trả) luôn đọc được vì nằm trong chính DbContext này.
/// </para>
/// </summary>
public sealed class SerialTimelineEndpoints : IInventorySubmodule
{
    public int Order => 61;

    public void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/inventory/serials/{serial}/timeline", async (
            string serial, InventoryDbContext db, SerialTimelineQueries queries, CancellationToken ct) =>
        {
            var sn = await db.SerialNumbers.FirstOrDefaultAsync(s => s.Serial == serial, ct);
            if (sn == null) throw NotFoundException.For("serial", serial);

            var timeline = new List<TimelineEntry>();

            // 1. Nhập kho — PO (và, khi W2-12 nối GRN, cả dòng GRN đã sinh ra serial này).
            if (sn.PurchaseOrderId.HasValue)
            {
                var po = await db.PurchaseOrders
                    .Where(p => p.Id == sn.PurchaseOrderId.Value)
                    .Select(p => new { p.PONumber, p.SupplierId, p.CreatedAt })
                    .FirstOrDefaultAsync(ct);

                if (po != null)
                {
                    var supplierName = await db.Suppliers
                        .Where(s => s.Id == po.SupplierId).Select(s => s.Name).FirstOrDefaultAsync(ct);
                    timeline.Add(new TimelineEntry(sn.ReceivedAt ?? po.CreatedAt, "Purchased", po.PONumber,
                        Party: supplierName));
                }
            }
            else if (sn.ReceivedAt.HasValue)
            {
                timeline.Add(new TimelineEntry(sn.ReceivedAt.Value, "Received", sn.Serial));
            }

            // 2. Bán — Sales.Orders
            if (sn.OrderId.HasValue && sn.SoldAt.HasValue)
            {
                var order = await queries.FindOrderAsync(sn.OrderId.Value, sn.Serial, ct);
                timeline.Add(new TimelineEntry(sn.SoldAt.Value, "Sold",
                    order?.Reference ?? sn.OrderId.Value.ToString(), Party: order?.Status));
            }

            // 3. Sửa chữa — Repair.WorkOrders
            if (sn.WorkOrderId.HasValue)
            {
                var workOrder = await queries.FindWorkOrderAsync(sn.WorkOrderId.Value, sn.Serial, ct);
                if (workOrder != null)
                    timeline.Add(new TimelineEntry(workOrder.At, "Repair", workOrder.Reference, workOrder.Status));
            }

            // 4. Bảo hành — Warranty.WarrantyClaims (theo chuỗi serial)
            foreach (var claim in await queries.FindWarrantyClaimsAsync(sn.Serial, ct))
                timeline.Add(new TimelineEntry(claim.At, "WarrantyClaim", claim.Reference, claim.Status));

            // 5. Trả lại
            if (sn.ReturnedAt.HasValue)
                timeline.Add(new TimelineEntry(sn.ReturnedAt.Value, "Returned", sn.Serial, Notes: sn.Notes));

            return Results.Ok(new
            {
                serial = sn.Serial,
                productId = sn.ProductId,
                productName = sn.ProductName,
                status = sn.Status.ToString(),
                warehouseId = sn.WarehouseId,
                warrantyMonths = sn.WarrantyMonths,
                warrantyEndDate = sn.WarrantyEndDate,
                timeline = timeline.OrderBy(t => t.At).ToList()
            });
        })
        .RequireAuthorization(Permissions.Inventory.ViewStock);
    }

    /// <summary>Một mốc trong vòng đời. Kiểu tường minh thay cho <c>List&lt;object&gt;</c> + reflection để sắp xếp.</summary>
    private sealed record TimelineEntry(
        DateTime At,
        string Type,
        string Reference,
        string? Status = null,
        string? Party = null,
        string? Notes = null);
}
