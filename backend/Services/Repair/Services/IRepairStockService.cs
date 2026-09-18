namespace Repair.Services;

/// <summary>
/// W2-13: replaces the dead <c>IInventoryService</c> HTTP client (pointed at
/// localhost:5001, never actually reachable) with real in-process calls into
/// Inventory's <c>IStockLedger</c> (Repair -> Inventory project reference).
///
/// A "part" on a work order references an <c>InventoryItems.Id</c> row
/// (<see cref="Domain.WorkOrderPart.InventoryItemId"/>), not a bare ProductId, so every
/// call here first resolves that row to the (ProductId, VariantId, WarehouseId)
/// triple <c>IStockLedger</c> actually keys on.
/// </summary>
public interface IRepairStockService
{
    /// <summary>Reserves stock for a part added to a work order. Throws
    /// <see cref="InvalidOperationException"/> when the item does not exist or
    /// available quantity is insufficient - the caller must not add the part.</summary>
    Task ReserveAsync(Guid inventoryItemId, int quantity, Guid workOrderId, string performedBy, CancellationToken ct = default);

    /// <summary>Releases a reservation (part removed, or work order cancelled with
    /// parts still only reserved, never consumed).</summary>
    Task ReleaseAsync(Guid inventoryItemId, int quantity, Guid workOrderId, string performedBy, CancellationToken ct = default);

    /// <summary>Commits a reservation to a real stock-out (repair completed).
    /// Reason = RepairPart.</summary>
    Task CommitAsync(Guid inventoryItemId, int quantity, Guid workOrderId, string performedBy, CancellationToken ct = default);
}
