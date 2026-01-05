namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

public class Product : Entity<Guid>
{
    public string Name { get; private set; }
    public decimal Price { get; private set; }
    public string Description { get; private set; }
    public Guid CategoryId { get; private set; }
    public Guid BrandId { get; private set; }
    public int StockQuantity { get; private set; }

    // Navigation properties (virtual for EF Core lazy loading if needed, or structured for configurations)
    // For Modular Monolith, we keep it simple.
    // public virtual Category Category { get; private set; }
    // public virtual Brand Brand { get; private set; }

    public Product(string name, decimal price, string description, Guid categoryId, Guid brandId, int stockQuantity)
    {
        Id = Guid.NewGuid();
        Name = name;
        Price = price;
        Description = description;
        CategoryId = categoryId;
        BrandId = brandId;
        StockQuantity = stockQuantity;
    }

    protected Product() { }

    public void UpdateStock(int quantity)
    {
        StockQuantity += quantity;
    }

    public void UpdateDetails(string name, string description, decimal price)
    {
        Name = name;
        Description = description;
        Price = price;
    }

    public void UpdatePrice(decimal price)
    {
        Price = price;
    }
}
