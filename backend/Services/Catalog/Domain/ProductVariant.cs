namespace Catalog.Domain;

using BuildingBlocks.SharedKernel;

/// <summary>
/// Biến thể cụ thể của 1 sản phẩm (Laptop XYZ + RAM 16GB + SSD 512GB + Bạc).
/// Có SKU, giá, tồn kho, ảnh riêng — thay cho việc tạo 6 sản phẩm rời trước đây.
/// </summary>
public class ProductVariant : Entity<Guid>
{
    public Guid ProductId { get; private set; }
    public string Sku { get; private set; } = string.Empty;

    /// <summary>Tên biến thể — auto-generate từ các option ("16GB / 512GB / Bạc").</summary>
    public string Name { get; private set; } = string.Empty;

    public decimal Price { get; private set; }
    public decimal? OldPrice { get; private set; }
    public decimal CostPrice { get; private set; }
    public int StockQuantity { get; private set; }
    public string? Barcode { get; private set; }
    public bool IsDefault { get; private set; }
    public VariantStatus Status { get; private set; }
    public int SortOrder { get; private set; }

    private readonly List<ProductVariantOption> _options = new();
    public IReadOnlyCollection<ProductVariantOption> Options => _options.AsReadOnly();

    // Navigation
    public virtual Product? Product { get; private set; }

    protected ProductVariant() { }

    public ProductVariant(
        Guid productId,
        string sku,
        string name,
        decimal price,
        decimal costPrice,
        int stockQuantity,
        decimal? oldPrice = null,
        string? barcode = null,
        bool isDefault = false,
        int sortOrder = 0)
    {
        if (productId == Guid.Empty)
            throw new ArgumentException("ProductId không được rỗng", nameof(productId));
        if (string.IsNullOrWhiteSpace(sku))
            throw new ArgumentException("SKU biến thể không được rỗng", nameof(sku));
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên biến thể không được rỗng", nameof(name));
        if (price < 0)
            throw new ArgumentException("Giá bán biến thể không được âm", nameof(price));
        if (costPrice < 0)
            throw new ArgumentException("Giá vốn biến thể không được âm", nameof(costPrice));
        if (stockQuantity < 0)
            throw new ArgumentException("Tồn kho biến thể không được âm", nameof(stockQuantity));

        Id = Guid.NewGuid();
        ProductId = productId;
        Sku = sku.Trim();
        Name = name.Trim();
        Price = price;
        OldPrice = oldPrice;
        CostPrice = costPrice;
        StockQuantity = stockQuantity;
        Barcode = barcode;
        IsDefault = isDefault;
        SortOrder = sortOrder;
        Status = DetermineStatus(stockQuantity);
    }

    public void UpdateDetails(string name, decimal price, decimal costPrice, decimal? oldPrice = null, string? barcode = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên biến thể không được rỗng", nameof(name));
        if (price < 0)
            throw new ArgumentException("Giá bán biến thể không được âm", nameof(price));
        if (costPrice < 0)
            throw new ArgumentException("Giá vốn biến thể không được âm", nameof(costPrice));

        Name = name.Trim();
        Price = price;
        CostPrice = costPrice;
        OldPrice = oldPrice;
        if (barcode != null) Barcode = barcode;
    }

    public void UpdateStock(int stockQuantity)
    {
        if (stockQuantity < 0)
            throw new ArgumentException("Tồn kho biến thể không được âm", nameof(stockQuantity));
        StockQuantity = stockQuantity;
        Status = DetermineStatus(stockQuantity);
    }

    public void SetDefault(bool value) => IsDefault = value;
    public void SetSortOrder(int order) => SortOrder = order;
    public void SetStatus(VariantStatus status) => Status = status;

    /// <summary>
    /// Gắn 1 tổ hợp OptionType + OptionValue vào biến thể (Ram: 16GB).
    /// Không cho phép 2 giá trị của cùng 1 OptionType.
    /// </summary>
    public void AddOption(Guid optionTypeId, Guid optionValueId)
    {
        if (_options.Any(o => o.OptionTypeId == optionTypeId))
            throw new InvalidOperationException($"Biến thể đã có giá trị cho OptionType {optionTypeId}");
        _options.Add(new ProductVariantOption(Id, optionTypeId, optionValueId));
    }

    public bool HasNegativeMargin() => CostPrice > Price;

    private static VariantStatus DetermineStatus(int qty)
    {
        if (qty > 10) return VariantStatus.InStock;
        if (qty > 0) return VariantStatus.LowStock;
        return VariantStatus.OutOfStock;
    }
}

public enum VariantStatus
{
    InStock = 1,
    LowStock = 2,
    OutOfStock = 3,
    Discontinued = 4,
}

/// <summary>
/// Junction table: 1 biến thể mang N tổ hợp (OptionType + OptionValue).
/// Vd variant "Laptop 16GB/512GB/Bạc" có 3 dòng: (RAM=16), (SSD=512), (Color=Silver).
/// </summary>
public class ProductVariantOption : Entity<Guid>
{
    public Guid VariantId { get; private set; }
    public Guid OptionTypeId { get; private set; }
    public Guid OptionValueId { get; private set; }

    // Navigation
    public virtual ProductVariant? Variant { get; private set; }
    public virtual ProductOptionType? OptionType { get; private set; }
    public virtual ProductOptionValue? OptionValue { get; private set; }

    protected ProductVariantOption() { }

    public ProductVariantOption(Guid variantId, Guid optionTypeId, Guid optionValueId)
    {
        if (variantId == Guid.Empty) throw new ArgumentException(nameof(variantId));
        if (optionTypeId == Guid.Empty) throw new ArgumentException(nameof(optionTypeId));
        if (optionValueId == Guid.Empty) throw new ArgumentException(nameof(optionValueId));

        Id = Guid.NewGuid();
        VariantId = variantId;
        OptionTypeId = optionTypeId;
        OptionValueId = optionValueId;
    }
}
