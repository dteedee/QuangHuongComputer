using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

public class GoodsReceivedNote : Entity<Guid>
{
    public GoodsReceivedNote() { Id = Guid.NewGuid(); }

    public string DocumentNumber { get; set; } = "";
    public DateTime DocumentDate { get; set; } = DateTime.UtcNow;
    public Guid? SupplierId { get; set; }
    public Guid? WarehouseId { get; set; }
    public Guid? PurchaseOrderId { get; set; }
    public string ReceivedBy { get; set; } = "";
    public string? Notes { get; set; }
    public GRNStatus Status { get; set; } = GRNStatus.Draft;
    public List<GRNItem> Items { get; set; } = new();
}

public class GRNItem : Entity<Guid>
{
    public GRNItem() { Id = Guid.NewGuid(); }

    public Guid GoodsReceivedNoteId { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = "";
    public int Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public string? SerialNumbers { get; set; }
}

public enum GRNStatus { Draft, Confirmed, Cancelled }
