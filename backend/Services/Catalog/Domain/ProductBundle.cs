namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

public class ProductBundle : Entity<Guid>
{
    public string Name { get; private set; }
    public string Description { get; private set; }
    public decimal TotalPrice { get; private set; }
    public decimal OriginalPrice { get; private set; }
    public string? ImageUrl { get; private set; }
    public DateTime? ValidFrom { get; private set; }
    public DateTime? ValidTo { get; private set; }

    private readonly List<ProductBundleItem> _items = new();
    public IReadOnlyCollection<ProductBundleItem> Items => _items.AsReadOnly();

    protected ProductBundle() { }

    public ProductBundle(string name, string description, decimal totalPrice, decimal originalPrice, string? imageUrl, DateTime? validFrom = null, DateTime? validTo = null)
    {
        Id = Guid.NewGuid();
        Name = name;
        Description = description;
        TotalPrice = totalPrice;
        OriginalPrice = originalPrice;
        ImageUrl = imageUrl;
        ValidFrom = validFrom;
        ValidTo = validTo;
        IsActive = true;
    }

    public void AddItem(Guid productId, bool isMainItem, int quantity, decimal originalUnitPrice, decimal discountPercentage)
    {
        var item = new ProductBundleItem(Id, productId, isMainItem, quantity, originalUnitPrice, discountPercentage);
        _items.Add(item);
    }
    
    public void ClearItems()
    {
        _items.Clear();
    }
    
    public void UpdateDetails(string name, string description, decimal totalPrice, decimal originalPrice, string? imageUrl, DateTime? validFrom, DateTime? validTo)
    {
        Name = name;
        Description = description;
        TotalPrice = totalPrice;
        OriginalPrice = originalPrice;
        ImageUrl = imageUrl;
        ValidFrom = validFrom;
        ValidTo = validTo;
        UpdatedAt = DateTime.UtcNow;
    }
}

public class ProductBundleItem : Entity<Guid>
{
    public Guid BundleId { get; private set; }
    public Guid ProductId { get; private set; }
    public bool IsMainItem { get; private set; } // e.g. The Laptop in a "Laptop + Mouse combo"
    public int Quantity { get; private set; }
    public decimal OriginalUnitPrice { get; private set; }
    public decimal DiscountPercentage { get; private set; }
    public decimal DiscountedUnitPrice => OriginalUnitPrice * (100 - DiscountPercentage) / 100;

    protected ProductBundleItem() { }

    internal ProductBundleItem(Guid bundleId, Guid productId, bool isMainItem, int quantity, decimal originalUnitPrice, decimal discountPercentage)
    {
        Id = Guid.NewGuid();
        BundleId = bundleId;
        ProductId = productId;
        IsMainItem = isMainItem;
        Quantity = quantity;
        OriginalUnitPrice = originalUnitPrice;
        DiscountPercentage = discountPercentage;
        IsActive = true;
    }
}
