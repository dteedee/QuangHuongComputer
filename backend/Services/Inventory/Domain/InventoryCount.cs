using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

public class InventoryCountSession : Entity<Guid>
{
    public InventoryCountSession() { Id = Guid.NewGuid(); }

    public string DocumentNumber { get; set; } = "";
    public DateTime CountDate { get; set; } = DateTime.UtcNow;
    public Guid? WarehouseId { get; set; }
    public CountScope Scope { get; set; } = CountScope.Full;
    public Guid? CategoryId { get; set; }
    public CountSessionStatus Status { get; set; } = CountSessionStatus.Open;
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? Notes { get; set; }
    public List<InventoryCountItem> Items { get; set; } = new();
}

public class InventoryCountItem : Entity<Guid>
{
    public InventoryCountItem() { Id = Guid.NewGuid(); }

    public Guid CountSessionId { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = "";
    public int SystemQuantity { get; set; }
    public int? CountedQuantity { get; set; }
    public int Variance => (CountedQuantity ?? SystemQuantity) - SystemQuantity;
    public string? CountedBy { get; set; }
    public string? Notes { get; set; }
}

public enum CountScope { Full, ByCategory }
public enum CountSessionStatus { Open, InProgress, PendingApproval, Approved, Cancelled }
