using InventoryModule.Domain;
using InventoryModule.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Sales.Domain;
using Sales.Infrastructure;

namespace Sales.Application.Returns;

/// <summary>
/// Phase 07: nhập lại kho theo tình trạng hàng khách trả về.
/// Bảng ánh xạ ReceivedCondition → WarehouseType:
///   Intact              → Main
///   UsedGood            → Returns  (bán lại "hàng trưng bày" giảm giá)
///   DefectiveTechnical  → Defective (gửi hãng RMA)
///   UserDamage          → Defective (từ chối / trừ tiền)
///   MissingAccessories  → Returns  (trừ tiền phụ kiện)
///
/// Sinh GoodsReceivedNote (Source = CustomerReturn) + StockMovement.
/// Cập nhật SerialNumber.Status → Returned / Defective nếu tìm được.
/// </summary>
public class RestockService
{
    private readonly SalesDbContext _salesDb;
    private readonly InventoryDbContext _inventoryDb;

    public RestockService(SalesDbContext salesDb, InventoryDbContext inventoryDb)
    {
        _salesDb = salesDb;
        _inventoryDb = inventoryDb;
    }

    /// <summary>
    /// Trả về GoodsReceivedNote đã confirm + inventory item mới (nếu tạo).
    /// Throw nếu chưa được kiểm hàng hoặc không xác định được kho đích.
    /// </summary>
    public async Task<RestockResult> RestockAsync(Guid returnRequestId, CancellationToken ct = default)
    {
        var rr = await _salesDb.ReturnRequests
            .FirstOrDefaultAsync(r => r.Id == returnRequestId, ct)
            ?? throw new InvalidOperationException("Không tìm thấy ReturnRequest.");

        if (rr.InspectedAt == null || rr.ReceivedCondition == null)
            throw new InvalidOperationException("Phải kiểm hàng (RecordInspection) trước khi nhập lại kho.");

        var order = await _salesDb.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == rr.OrderId, ct)
            ?? throw new InvalidOperationException("Order gốc không tồn tại.");

        var orderItem = order.Items.FirstOrDefault(i => i.Id == rr.OrderItemId)
            ?? throw new InvalidOperationException("OrderItem gốc không tồn tại.");

        var warehouseId = rr.RestockWarehouseId!.Value;
        var expectedType = DetermineWarehouseType(rr.ReceivedCondition!.Value);

        // Verify warehouse phù hợp — tránh nhân viên chọn kho sai (VD: hàng lỗi nhập Main).
        var warehouse = await _inventoryDb.Warehouses.FirstOrDefaultAsync(w => w.Id == warehouseId, ct)
            ?? throw new InvalidOperationException("Kho nhập không tồn tại.");
        if (warehouse.Type != expectedType)
            throw new InvalidOperationException(
                $"Tình trạng {rr.ReceivedCondition} phải nhập kho loại {expectedType}, kho chọn là {warehouse.Type}.");

        // Lấy hoặc tạo InventoryItem cho ProductId + VariantId ở kho đích.
        var inv = await _inventoryDb.InventoryItems
            .FirstOrDefaultAsync(i => i.ProductId == orderItem.ProductId
                                    && i.VariantId == orderItem.VariantId
                                    && i.WarehouseId == warehouseId, ct);
        if (inv == null)
        {
            inv = new InventoryItem(
                productId: orderItem.ProductId,
                variantId: orderItem.VariantId,
                initialQuantity: 0,
                warehouseId: warehouseId);
            _inventoryDb.InventoryItems.Add(inv);
            await _inventoryDb.SaveChangesAsync(ct);
        }

        // Cộng tồn thật cho kho đích.
        var quantity = orderItem.Quantity;
        inv.AdjustStock(quantity, $"Customer return {rr.Id}");

        // Ghi StockMovement.
        var movement = new StockMovement(
            inventoryItemId: inv.Id,
            productId: orderItem.ProductId,
            type: MovementType.In,
            quantity: quantity,
            reason: $"Khách trả hàng ({rr.ReceivedCondition})",
            referenceId: rr.Id.ToString(),
            referenceType: "ReturnRequest");
        _inventoryDb.StockMovements.Add(movement);

        // Sinh GRN (Source = CustomerReturn).
        var grn = new GoodsReceivedNote
        {
            DocumentNumber = $"GRN-RET-{DateTime.UtcNow:yyyyMMddHHmmss}-{rr.Id.ToString()[..6]}",
            DocumentDate = DateTime.UtcNow,
            WarehouseId = warehouseId,
            Source = GRNSource.CustomerReturn,
            ReferenceOrderId = rr.Id,
            ReceivedBy = rr.InspectedBy?.ToString() ?? "system",
            Status = GRNStatus.Confirmed,
            Notes = $"Nhập lại từ ReturnRequest {rr.Id} — {rr.ReceivedCondition}"
        };
        grn.Items.Add(new GRNItem
        {
            GoodsReceivedNoteId = grn.Id,
            ProductId = orderItem.ProductId,
            ProductName = orderItem.ProductName,
            Quantity = quantity,
            UnitCost = orderItem.UnitPrice,
            AcceptedQty = quantity,
            RejectedQty = 0
        });
        _inventoryDb.GoodsReceivedNotes.Add(grn);

        // Cập nhật SerialNumber theo Order gốc.
        var serials = await _inventoryDb.SerialNumbers
            .Where(sn => sn.OrderId == rr.OrderId && sn.ProductId == orderItem.ProductId)
            .Take(quantity)
            .ToListAsync(ct);
        foreach (var sn in serials)
        {
            if (sn.Status == SerialStatus.Sold)
            {
                if (rr.ReceivedCondition == ReceivedCondition.DefectiveTechnical
                    || rr.ReceivedCondition == ReceivedCondition.UserDamage)
                {
                    sn.MarkDefective($"Return {rr.Id}: {rr.ReceivedCondition}");
                }
                else
                {
                    sn.Return($"Return {rr.Id}: {rr.ReceivedCondition}");
                }
                sn.TransferWarehouse(warehouseId);
            }
        }

        await _inventoryDb.SaveChangesAsync(ct);

        return new RestockResult(grn.Id, inv.Id, quantity, warehouse.Type);
    }

    /// <summary>Ánh xạ tình trạng → loại kho bắt buộc.</summary>
    public static WarehouseType DetermineWarehouseType(ReceivedCondition condition) => condition switch
    {
        ReceivedCondition.Intact => WarehouseType.Main,
        ReceivedCondition.UsedGood => WarehouseType.Returns,
        ReceivedCondition.MissingAccessories => WarehouseType.Returns,
        ReceivedCondition.DefectiveTechnical => WarehouseType.Defective,
        ReceivedCondition.UserDamage => WarehouseType.Defective,
        _ => throw new ArgumentOutOfRangeException(nameof(condition))
    };
}

public record RestockResult(Guid GoodsReceivedNoteId, Guid InventoryItemId, int Quantity, WarehouseType WarehouseType);
