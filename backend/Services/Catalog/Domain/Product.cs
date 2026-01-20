namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

public class Product : Entity<Guid>
{
    public string Name { get; private set; }
    public string Sku { get; private set; }
    public decimal Price { get; private set; }
    public decimal? OldPrice { get; private set; }
    public string Description { get; private set; }
    public string? Specifications { get; private set; } // JSON string storing specs like RAM, SSD, etc.
    public string? WarrantyInfo { get; private set; }
    public Guid CategoryId { get; private set; }
    public Guid BrandId { get; private set; }
    public int StockQuantity { get; private set; }
    public ProductStatus Status { get; private set; }

    // Navigation properties (virtual for EF Core lazy loading if needed, or structured for configurations)
    // For Modular Monolith, we keep it simple.
    // public virtual Category Category { get; private set; }
    // public virtual Brand Brand { get; private set; }

    public Product(
        string name,
        decimal price,
        string description,
        Guid categoryId,
        Guid brandId,
        int stockQuantity,
        string? sku = null,
        decimal? oldPrice = null,
        string? specifications = null,
        string? warrantyInfo = null)
    {
        Id = Guid.NewGuid();
        Name = name;
        Sku = sku ?? GenerateSku();
        Price = price;
        OldPrice = oldPrice;
        Description = description;
        Specifications = specifications;
        WarrantyInfo = warrantyInfo ?? "Bảo hành 24 tháng";
        CategoryId = categoryId;
        BrandId = brandId;
        StockQuantity = stockQuantity;
        Status = DetermineStatus(stockQuantity);
    }

    protected Product() { }

    private string GenerateSku()
    {
        return $"QH-{Guid.NewGuid().ToString("N")[..8].ToUpper()}";
    }

    private ProductStatus DetermineStatus(int quantity)
    {
        if (quantity > 10) return ProductStatus.InStock;
        if (quantity > 0) return ProductStatus.LowStock;
        return ProductStatus.OutOfStock;
    }

    public void UpdateStock(int quantity)
    {
        StockQuantity += quantity;
        Status = DetermineStatus(StockQuantity);
    }

    public void UpdateDetails(string name, string description, decimal price, decimal? oldPrice = null, string? specifications = null, string? warrantyInfo = null)
    {
        Name = name;
        Description = description;
        Price = price;
        if (oldPrice.HasValue) OldPrice = oldPrice;
        if (specifications != null) Specifications = specifications;
        if (warrantyInfo != null) WarrantyInfo = warrantyInfo;
    }

    public void UpdatePrice(decimal price, decimal? oldPrice = null)
    {
        Price = price;
        if (oldPrice.HasValue) OldPrice = oldPrice;
    }

    public void UpdateSpecifications(string specifications)
    {
        Specifications = specifications;
    }
}

public enum ProductStatus
{
    InStock,
    LowStock,
    OutOfStock,
    PreOrder
}
