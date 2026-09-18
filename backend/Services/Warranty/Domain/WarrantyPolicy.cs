using BuildingBlocks.SharedKernel;

namespace Warranty.Domain;

public class WarrantyPolicy : Entity<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public int DurationMonths { get; private set; }
    public string CoverageTerms { get; private set; } = string.Empty;

    // Phase 07: phạm vi + loại trừ.
    public string? Scope { get; private set; }
    /// <summary>JSON array — VD: ["rơi vỡ","vào nước","tự tháo máy"].</summary>
    public string? Exclusions { get; private set; }
    /// <summary>Nhà cung cấp bảo hành mà policy này áp dụng.</summary>
    public WarrantyProvider Provider { get; private set; } = WarrantyProvider.Manufacturer;

    /// <summary>
    /// D08 bước 2: policy theo danh mục LÁ (Catalog.Category.Id, không FK — module độc lập).
    /// NULL = policy DEFAULT toàn hệ thống (fallback cuối cùng khi không danh mục nào trong
    /// chuỗi cha có policy). Unique active (CategoryId, Provider) ở DbContext.
    /// </summary>
    public Guid? CategoryId { get; private set; }

    public WarrantyPolicy(
        string name,
        string description,
        int durationMonths,
        string coverageTerms,
        string? scope = null,
        string? exclusions = null,
        WarrantyProvider provider = WarrantyProvider.Manufacturer,
        Guid? categoryId = null)
    {
        if (durationMonths < 0 || durationMonths > 120)
            throw new ArgumentOutOfRangeException(nameof(durationMonths), "Số tháng bảo hành phải trong khoảng 0-120.");

        Id = Guid.NewGuid();
        Name = name;
        Description = description;
        DurationMonths = durationMonths;
        CoverageTerms = coverageTerms;
        Scope = scope;
        Exclusions = exclusions;
        Provider = provider;
        CategoryId = categoryId;
    }

    protected WarrantyPolicy() { }

    public void Update(string name, string description, int durationMonths, string coverageTerms,
        string? scope, string? exclusions, WarrantyProvider provider, Guid? categoryId)
    {
        if (durationMonths < 0 || durationMonths > 120)
            throw new ArgumentOutOfRangeException(nameof(durationMonths), "Số tháng bảo hành phải trong khoảng 0-120.");

        Name = name;
        Description = description;
        DurationMonths = durationMonths;
        CoverageTerms = coverageTerms;
        Scope = scope;
        Exclusions = exclusions;
        Provider = provider;
        CategoryId = categoryId;
        UpdatedAt = DateTime.UtcNow;
    }
}
