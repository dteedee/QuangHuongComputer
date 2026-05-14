using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

public class DeliveryNote : Entity<Guid>
{
    public DeliveryNote() { Id = Guid.NewGuid(); }

    public string DocumentNumber { get; set; } = "";
    public DateTime DocumentDate { get; set; } = DateTime.UtcNow;
    public Guid? WarehouseId { get; set; }
    public Guid? OrderId { get; set; }
    public string DeliveredBy { get; set; } = "";
    public DNReason Reason { get; set; } = DNReason.Sale;
    public string? Notes { get; set; }
    public DNStatus Status { get; set; } = DNStatus.Draft;
    public List<DNItem> Items { get; set; } = new();
}

public class DNItem : Entity<Guid>
{
    public DNItem() { Id = Guid.NewGuid(); }

    public Guid DeliveryNoteId { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = "";
    public int Quantity { get; set; }
    public string? SerialNumbers { get; set; }
}

public enum DNReason { Sale, Transfer, WarrantyReplace, Defect, Other }
public enum DNStatus { Draft, Confirmed, Cancelled }
