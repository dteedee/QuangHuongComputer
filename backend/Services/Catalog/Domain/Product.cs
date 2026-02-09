namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

public class Product : Entity<Guid>
{
    public string Name { get; private set; }
    public string Sku { get; private set; }
    public decimal Price { get; private set; }
    public decimal? OldPrice { get; private set; }
    public decimal CostPrice { get; private set; }
    public string Description { get; private set; }
    public string? Specifications { get; private set; } // JSON string storing specs like RAM, SSD, etc.
    public string? WarrantyInfo { get; private set; }
    public string? StockLocations { get; private set; } // JSON string storing list of store addresses
    public Guid CategoryId { get; private set; }
    public Guid BrandId { get; private set; }
    public int StockQuantity { get; private set; }
    public ProductStatus Status { get; private set; }
    
    // Enhanced fields for Phase 1 improvements
    public string? Barcode { get; private set; }
    public decimal Weight { get; private set; }
    public string? ImageUrl { get; private set; }
    public string? GalleryImages { get; private set; } // JSON array
    public int ViewCount { get; private set; }
    public int SoldCount { get; private set; }
    public float AverageRating { get; private set; }
    public int ReviewCount { get; private set; }
    public DateTime? PublishedAt { get; private set; }
    public DateTime? DiscontinuedAt { get; private set; }
    public int LowStockThreshold { get; private set; } = 5;
    
    // Audit fields
    public Guid? CreatedByUserId { get; private set; }
    public Guid? UpdatedByUserId { get; private set; }
    
    // SEO fields
    public string? MetaTitle { get; private set; }
    public string? MetaDescription { get; private set; }
    public string? MetaKeywords { get; private set; }
    public string? CanonicalUrl { get; private set; }
    
    // Navigation properties
    public virtual Category? Category { get; private set; }
    public virtual Brand? Brand { get; private set; }

    public Product(
        string name,
        decimal price,
        decimal costPrice,
        string description,
        Guid categoryId,
        Guid brandId,
        int stockQuantity,
        string? sku = null,
        decimal? oldPrice = null,
        string? specifications = null,
        string? warrantyInfo = null,
        string? barcode = null,
        decimal weight = 0,
        string? imageUrl = null,
        string? galleryImages = null,
        string? stockLocations = null,
        string? metaTitle = null,
        string? metaDescription = null,
        string? metaKeywords = null,
        Guid? createdByUserId = null)
    {
        Id = Guid.NewGuid();
        Name = name;
        Sku = sku ?? GenerateSku();
        Price = price;
        OldPrice = oldPrice;
        CostPrice = costPrice;
        Description = description;
        Specifications = specifications;
        WarrantyInfo = warrantyInfo ?? "Bảo hành 24 tháng";
        CategoryId = categoryId;
        BrandId = brandId;
        StockQuantity = stockQuantity;
        Status = DetermineStatus(stockQuantity);
        Barcode = barcode;
        Weight = weight;
        ImageUrl = imageUrl;
        GalleryImages = galleryImages;
        StockLocations = stockLocations;
        ViewCount = 0;
        SoldCount = 0;
        AverageRating = 0;
        ReviewCount = 0;
        PublishedAt = DateTime.UtcNow;
        LowStockThreshold = 5;
        CreatedByUserId = createdByUserId;
        MetaTitle = metaTitle;
        MetaDescription = metaDescription;
        MetaKeywords = metaKeywords;
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

    public void UpdateDetails(string name, string description, decimal price, decimal? oldPrice = null, string? specifications = null, string? warrantyInfo = null, string? stockLocations = null)
    {
        Name = name;
        Description = description;
        Price = price;
        if (oldPrice.HasValue) OldPrice = oldPrice;
        if (specifications != null) Specifications = specifications;
        if (warrantyInfo != null) WarrantyInfo = warrantyInfo;
        if (stockLocations != null) StockLocations = stockLocations;
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
    
    public void UpdateCostPrice(decimal costPrice)
    {
        CostPrice = costPrice;
    }
    
    public void IncrementViewCount()
    {
        ViewCount++;
    }
    
    public void IncrementSoldCount(int quantity = 1)
    {
        SoldCount += quantity;
    }
    
    public void UpdateRating(float newRating)
    {
        AverageRating = newRating;
    }
    
    public void Publish()
    {
        PublishedAt = DateTime.UtcNow;
    }
    
    public void Discontinue()
    {
        DiscontinuedAt = DateTime.UtcNow;
        IsActive = false;
    }
    
    public void UpdateImage(string imageUrl, string? galleryImages = null)
    {
        ImageUrl = imageUrl;
        if (galleryImages != null) GalleryImages = galleryImages;
    }
    
    public void UpdateSeo(string? metaTitle = null, string? metaDescription = null, string? metaKeywords = null, string? canonicalUrl = null)
    {
        MetaTitle = metaTitle;
        MetaDescription = metaDescription;
        MetaKeywords = metaKeywords;
        CanonicalUrl = canonicalUrl;
    }
    
    public bool IsLowStock() => StockQuantity <= LowStockThreshold;
}

public enum ProductStatus
{
    InStock,
    LowStock,
    OutOfStock,
    PreOrder
}
