using BuildingBlocks.SharedKernel;

namespace InventoryModule.Domain;

public class InventoryItem : Entity<Guid>
{
    public Guid ProductId { get; private set; }
    public int QuantityOnHand { get; private set; }
    public int ReorderLevel { get; private set; }

    public InventoryItem(Guid productId, int initialQuantity, int reorderLevel = 5)
    {
        Id = Guid.NewGuid();
        ProductId = productId;
        QuantityOnHand = initialQuantity;
        ReorderLevel = reorderLevel;
    }

    protected InventoryItem() { }

    public void AdjustStock(int quantity)
    {
        QuantityOnHand += quantity;
    }

    public bool NeedsReorder() => QuantityOnHand <= ReorderLevel;
}
