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
    public string Slug { get; private set; } = string.Empty;
    public string? MetaTitle { get; private set; }
    public string? MetaDescription { get; private set; }
    public string? MetaKeywords { get; private set; }
    public string? CanonicalUrl { get; private set; }

    /// <summary>
    /// JSON extensibility: freeform key/value attributes (jsonb). Declared keys are validated
    /// against CustomFieldDefinition (EntityType="Product") at the endpoint layer; unknown keys
    /// are always allowed so new attributes don't require a schema migration.
    /// </summary>
    public string? Attributes { get; private set; }

    // Navigation properties
    public virtual Category? Category { get; private set; }
    public virtual Brand? Brand { get; private set; }

    // ------- Phase 03: Media / Variant / Specification collections -------
    // Backing collections nạp lười qua EF; expose IReadOnly để giữ encapsulation.
    private readonly List<ProductMedia> _medias = new();
    public virtual IReadOnlyCollection<ProductMedia> Medias => _medias.AsReadOnly();

    private readonly List<ProductVariant> _variants = new();
    public virtual IReadOnlyCollection<ProductVariant> Variants => _variants.AsReadOnly();

    private readonly List<ProductSpecificationValue> _specValues = new();
    public virtual IReadOnlyCollection<ProductSpecificationValue> SpecValues => _specValues.AsReadOnly();

    /// <summary>
    /// Ảnh chính hiển thị. Ưu tiên media Primary; fallback về cột legacy `ImageUrl` (giữ tương thích).
    /// EF ánh xạ cột "ImageUrl" — không phá schema cũ.
    /// </summary>
    public string? EffectiveImageUrl
    {
        get
        {
            var primary = _medias.FirstOrDefault(m => m.IsPrimary && m.Type == MediaType.Image);
            return primary?.Url ?? ImageUrl;
        }
    }

    /// <summary>Giá hiển thị: nếu có biến thể đang bán, lấy MIN(Variants.Price); nếu không, `Price` của sản phẩm.</summary>
    public decimal EffectivePrice
    {
        get
        {
            var activeVariants = _variants
                .Where(v => v.Status == VariantStatus.InStock || v.Status == VariantStatus.LowStock)
                .ToList();
            if (activeVariants.Count == 0) return Price;
            return activeVariants.Min(v => v.Price);
        }
    }

    public bool HasVariants() => _variants.Count > 0;

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
        // Validate nghiệp vụ: giá bán/giá vốn không được âm.
        if (price < 0)
            throw new ArgumentException("Giá bán không được âm", nameof(price));
        if (costPrice < 0)
            throw new ArgumentException("Giá vốn không được âm", nameof(costPrice));

        Id = Guid.NewGuid();
        Name = name;
        Sku = sku ?? GenerateSku();
        Slug = SlugGenerator.Generate(name); // Auto-sinh slug SEO từ Name.
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

    public void UpdateDetails(string name, string description, decimal price, decimal? oldPrice = null, string? specifications = null, string? warrantyInfo = null, string? stockLocations = null, decimal? weight = null, string? barcode = null)
    {
        Name = name;
        Description = description;
        Price = price;
        if (oldPrice.HasValue) OldPrice = oldPrice;
        if (specifications != null) Specifications = specifications;
        if (warrantyInfo != null) WarrantyInfo = warrantyInfo;
        if (stockLocations != null) StockLocations = stockLocations;
        if (weight.HasValue) Weight = weight.Value;
        if (barcode != null) Barcode = barcode;
    }

    public void UpdateCategory(Guid categoryId)
    {
        CategoryId = categoryId;
    }

    public void UpdateBrand(Guid brandId)
    {
        BrandId = brandId;
    }

    public void UpdateStockQuantity(int quantity)
    {
        StockQuantity = quantity;
        Status = DetermineStatus(StockQuantity);
    }

    public void UpdateLowStockThreshold(int threshold)
    {
        LowStockThreshold = threshold;
    }

    public void UpdateSku(string sku)
    {
        if (!string.IsNullOrWhiteSpace(sku))
            Sku = sku;
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

    /// <summary>Set/replace the JSON extensibility attributes blob. Caller is responsible for validation.</summary>
    public void SetAttributes(string? attributesJson)
    {
        Attributes = attributesJson;
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

    /// <summary>
    /// True nếu giá vốn > giá bán (bán lỗ / âm margin).
    /// Không throw ở ctor vì có trường hợp hợp lệ (xả hàng, khuyến mãi có chủ đích);
    /// nghiệp vụ dùng cờ này để cảnh báo/chặn xuất kho lỗ vô ý.
    /// </summary>
    public bool HasNegativeMargin() => CostPrice > Price;

    /// <summary>
    /// Cập nhật slug SEO. Chấp nhận slug đã pre-generated (giữ nguyên suffix "-2", "-3"...);
    /// chỉ normalize khi phát hiện ký tự có dấu / khoảng trắng.
    /// </summary>
    public void SetSlug(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
            throw new ArgumentException("Slug không được rỗng", nameof(slug));
        Slug = SlugGenerator.Generate(slug);
    }

    // ------- Phase 03: helpers thao tác media / variant -------

    /// <summary>
    /// Thêm media vào sản phẩm. Nếu đặt IsPrimary=true, tự động unset các primary khác.
    /// </summary>
    public void AddMedia(ProductMedia media)
    {
        if (media == null) throw new ArgumentNullException(nameof(media));
        if (media.ProductId != Id)
            throw new InvalidOperationException("ProductId của media không khớp sản phẩm");
        if (media.IsPrimary)
            UnsetOtherPrimaryMedias(media.Id);
        _medias.Add(media);
    }

    public void RemoveMedia(Guid mediaId)
    {
        var m = _medias.FirstOrDefault(x => x.Id == mediaId);
        if (m != null) _medias.Remove(m);
    }

    /// <summary>
    /// Chỉ định 1 media làm ảnh chính duy nhất. Các media khác tự động bị unset.
    /// Chỉ áp dụng cho media loại Image.
    /// </summary>
    public void SetPrimaryMedia(Guid mediaId)
    {
        var target = _medias.FirstOrDefault(x => x.Id == mediaId)
            ?? throw new InvalidOperationException($"Không tìm thấy media {mediaId}");
        if (target.Type != MediaType.Image)
            throw new InvalidOperationException("Chỉ ảnh mới được đặt làm ảnh chính");
        UnsetOtherPrimaryMedias(mediaId);
        target.SetPrimary(true);
    }

    private void UnsetOtherPrimaryMedias(Guid keepId)
    {
        foreach (var m in _medias.Where(x => x.Id != keepId && x.IsPrimary))
            m.SetPrimary(false);
    }

    public void AddVariant(ProductVariant variant)
    {
        if (variant == null) throw new ArgumentNullException(nameof(variant));
        if (variant.ProductId != Id)
            throw new InvalidOperationException("ProductId của biến thể không khớp sản phẩm");
        if (_variants.Any(v => v.Sku == variant.Sku))
            throw new InvalidOperationException($"Đã tồn tại biến thể SKU '{variant.Sku}' trong sản phẩm");
        // Chỉ 1 default
        if (variant.IsDefault)
            foreach (var v in _variants.Where(x => x.IsDefault)) v.SetDefault(false);
        _variants.Add(variant);
    }

    public void RemoveVariant(Guid variantId)
    {
        var v = _variants.FirstOrDefault(x => x.Id == variantId);
        if (v != null) _variants.Remove(v);
    }

    public void AddSpecificationValue(ProductSpecificationValue value)
    {
        if (value == null) throw new ArgumentNullException(nameof(value));
        if (value.ProductId != Id)
            throw new InvalidOperationException("ProductId của spec value không khớp sản phẩm");
        // Chỉ 1 giá trị per attribute
        var existing = _specValues.FirstOrDefault(x => x.AttributeId == value.AttributeId);
        if (existing != null) _specValues.Remove(existing);
        _specValues.Add(value);
    }
}

public enum ProductStatus
{
    InStock,
    LowStock,
    OutOfStock,
    PreOrder
}
