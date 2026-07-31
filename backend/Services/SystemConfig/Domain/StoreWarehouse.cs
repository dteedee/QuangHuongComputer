using BuildingBlocks.SharedKernel;

namespace SystemConfig.Domain;

/// <summary>
/// Junction: 1 Store có nhiều Warehouse trực thuộc.
/// Chỉ giữ Guid — KHÔNG import Inventory.Warehouse entity để tránh coupling cross-module.
/// </summary>
public class StoreWarehouse : Entity<Guid>
{
    public Guid StoreId { get; private set; }
    public Guid WarehouseId { get; private set; }
    public DateTime AssignedAt { get; private set; }
    public bool IsPrimary { get; private set; }

    protected StoreWarehouse() { }

    public StoreWarehouse(Guid storeId, Guid warehouseId, bool isPrimary = false)
    {
        Id = Guid.NewGuid();
        StoreId = storeId;
        WarehouseId = warehouseId;
        IsPrimary = isPrimary;
        AssignedAt = DateTime.UtcNow;
    }

    public void MarkPrimary() => IsPrimary = true;
    public void UnmarkPrimary() => IsPrimary = false;
}
