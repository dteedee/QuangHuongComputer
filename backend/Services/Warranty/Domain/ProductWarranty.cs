using BuildingBlocks.SharedKernel;

namespace Warranty.Domain;

public class ProductWarranty : Entity<Guid>
{
    public Guid ProductId { get; private set; }
    public string SerialNumber { get; private set; }
    public Guid CustomerId { get; private set; }
    public DateTime PurchaseDate { get; private set; }
    public DateTime ExpirationDate { get; private set; }
    public int WarrantyPeriodMonths { get; private set; }
    public WarrantyStatus Status { get; private set; }
    public string? Notes { get; private set; }
    public string? OrderNumber { get; private set; }

    public ProductWarranty(Guid productId, string serialNumber, Guid customerId, DateTime purchaseDate, int warrantyPeriodMonths, string? orderNumber = null)
    {
        Id = Guid.NewGuid();
        ProductId = productId;
        SerialNumber = serialNumber;
        CustomerId = customerId;
        PurchaseDate = purchaseDate;
        WarrantyPeriodMonths = warrantyPeriodMonths;
        ExpirationDate = purchaseDate.AddMonths(warrantyPeriodMonths);
        Status = WarrantyStatus.Active;
        OrderNumber = orderNumber;
    }

    protected ProductWarranty() { }

    public bool IsValid()
    {
        return Status == WarrantyStatus.Active && DateTime.UtcNow <= ExpirationDate;
    }

    public void Void(string reason)
    {
        Status = WarrantyStatus.Voided;
        Notes = reason;
    }

    public void Expire()
    {
        Status = WarrantyStatus.Expired;
    }
}

public enum WarrantyStatus
{
    Active,
    Expired,
    Voided
}
